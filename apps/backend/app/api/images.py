"""
BaazarSetu — Images API
Upload, process, and retrieve product images.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.user import User
from app.models.image import ProductImage, ProcessingStatus
from app.utils.dependencies import get_current_user
from app.utils.response import success_response, error_response
from app.services.storage_service import storage_service, StorageError
from app.services.image_service import image_processing_service, ImageProcessingError
from app.services.ocr_service import ocr_service
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/images", tags=["Image Studio"])


@router.post("/upload", response_model=dict, status_code=201)
async def upload_image(
    image: UploadFile = File(...),
    product_id: Optional[uuid.UUID] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a product image. Returns image_id for subsequent processing."""
    image_bytes = await image.read()
    try:
        path = await storage_service.save_image(image_bytes, image.filename or "upload.jpg")
    except StorageError as e:
        raise HTTPException(status_code=400, detail=error_response("STORAGE_ERROR", str(e)))

    record = ProductImage(
        product_id=product_id,
        uploader_id=current_user.user_id,
        original_path=path,
        processing_status=ProcessingStatus.pending,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return success_response(
        data={"image_id": str(record.image_id), "original_path": path},
        message="Image uploaded successfully",
    )


@router.post("/remove-background", response_model=dict, status_code=200)
async def remove_background(
    image: UploadFile = File(...),
    add_white_bg: bool = Form(True),
    current_user: User = Depends(get_current_user),
):
    """Remove background from image using rembg. Returns processed image as file URL."""
    image_bytes = await image.read()
    try:
        storage_service.validate_image(image_bytes, image.filename or "img.jpg")
    except StorageError as e:
        raise HTTPException(status_code=400, detail=error_response("VALIDATION_ERROR", str(e)))

    try:
        processed = await image_processing_service.remove_background(image_bytes, add_white_bg)
    except ImageProcessingError as e:
        raise HTTPException(
            status_code=503,
            detail=error_response("PROCESSING_ERROR", str(e)),
        )

    try:
        path = await storage_service.save_image(processed, "bg_removed.png", "processed")
    except StorageError as e:
        raise HTTPException(status_code=500, detail=error_response("STORAGE_ERROR", str(e)))

    return success_response(
        data={"processed_path": path},
        message="Background removed successfully",
    )


@router.post("/enhance", response_model=dict, status_code=200)
async def enhance_image(
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Enhance image: auto-contrast, brightness, sharpness."""
    image_bytes = await image.read()
    try:
        storage_service.validate_image(image_bytes, image.filename or "img.jpg")
        enhanced = await image_processing_service.enhance_image(image_bytes)
        path = await storage_service.save_image(enhanced, "enhanced.jpg", "processed")
    except (StorageError, ImageProcessingError) as e:
        raise HTTPException(status_code=400, detail=error_response("PROCESSING_ERROR", str(e)))

    return success_response(data={"enhanced_path": path})


@router.post("/process", response_model=dict, status_code=200)
async def process_image_full(
    image: UploadFile = File(...),
    remove_background: bool = Form(True),
    enhance: bool = Form(True),
    resize: bool = Form(True),
    current_user: User = Depends(get_current_user),
):
    """Run full image processing pipeline: background removal → enhancement → resize."""
    image_bytes = await image.read()
    try:
        storage_service.validate_image(image_bytes, image.filename or "img.jpg")
    except StorageError as e:
        raise HTTPException(status_code=400, detail=error_response("VALIDATION_ERROR", str(e)))

    result = await image_processing_service.process_product_image(
        image_bytes,
        remove_bg=remove_background,
        enhance=enhance,
        resize=resize,
    )

    processed_bytes = result.get("processed_bytes", image_bytes)
    thumbnail_bytes = result.get("thumbnail_bytes")

    processed_path = await storage_service.save_image(processed_bytes, "processed.jpg", "processed")
    thumbnail_path = None
    if thumbnail_bytes:
        thumbnail_path = await storage_service.save_image(thumbnail_bytes, "thumb.jpg", "processed")

    return success_response(
        data={
            "processed_path": processed_path,
            "thumbnail_path": thumbnail_path,
            "processing_metadata": {
                "background_removed": result.get("background_removed"),
                "lighting_improved": result.get("lighting_improved"),
                "crop_applied": result.get("crop_applied"),
                "resize_applied": result.get("resize_applied"),
            },
        }
    )


@router.post("/ocr", response_model=dict, status_code=200)
async def extract_text_from_image(
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Extract text from product image using PaddleOCR."""
    image_bytes = await image.read()
    try:
        storage_service.validate_image(image_bytes, image.filename or "img.jpg")
    except StorageError as e:
        raise HTTPException(status_code=400, detail=error_response("VALIDATION_ERROR", str(e)))

    result = await ocr_service.extract_text(image_bytes)
    return success_response(data=result)


@router.get("/{image_id}", response_model=dict, status_code=200)
async def get_image(
    image_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get image record by ID."""
    result = await db.execute(
        select(ProductImage).where(ProductImage.image_id == image_id)
    )
    image_rec = result.scalar_one_or_none()
    if not image_rec:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Image not found"))

    return success_response(
        data={
            "image_id": str(image_rec.image_id),
            "product_id": str(image_rec.product_id) if image_rec.product_id else None,
            "original_path": image_rec.original_path,
            "processed_path": image_rec.processed_path,
            "thumbnail_path": image_rec.thumbnail_path,
            "background_removed": image_rec.background_removed,
            "lighting_improved": image_rec.lighting_improved,
            "crop_applied": image_rec.crop_applied,
            "is_primary": image_rec.is_primary,
            "processing_status": image_rec.processing_status,
        }
    )
