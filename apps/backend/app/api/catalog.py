"""
BaazarSetu — Catalog API
POST /api/v1/catalog/generate
GET  /api/v1/catalog/{product_id}
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.user import User
from app.models.artisan import Artisan
from app.models.product import Product
from app.models.catalog import Catalog
from app.utils.dependencies import get_current_user, require_artisan
from app.utils.response import success_response, error_response
from app.services.storage_service import storage_service, StorageError
from app.services.gemini_service import gemini_service
from app.services.translation_service import translation_service
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/catalog", tags=["AI Catalog"])


@router.post("/generate", response_model=dict, status_code=200)
async def generate_catalog(
    product_id: uuid.UUID = Form(..., description="Product ID to generate catalog for"),
    image: Optional[UploadFile] = File(None, description="Product image (optional if already uploaded)"),
    seller_text: Optional[str] = Form(None, description="Seller's text description"),
    voice_transcript: Optional[str] = Form(None, description="Pre-transcribed voice text"),
    source_language: str = Form("en", description="Language of seller_text/voice_transcript"),
    db: AsyncSession = Depends(get_db),
    auth: tuple = Depends(require_artisan),
):
    """
    Generate AI product catalog using Gemini multimodal.
    
    Pipeline:
    1. Load product from DB
    2. Translate seller text to English (if not English)
    3. Send image + context to Gemini
    4. Save catalog record
    5. Return generated catalog for artisan review/edit
    """
    _, artisan = auth

    # Verify product ownership
    prod_result = await db.execute(
        select(Product).where(
            Product.product_id == product_id,
            Product.seller_id == artisan.artisan_id,
        )
    )
    product = prod_result.scalar_one_or_none()
    if not product:
        raise HTTPException(
            status_code=404,
            detail=error_response("NOT_FOUND", "Product not found or not yours"),
        )

    # Load image bytes
    image_bytes = None
    if image:
        try:
            raw = await image.read()
            storage_service.validate_image(raw, image.filename or "img.jpg")
            image_bytes = raw
        except StorageError as e:
            raise HTTPException(status_code=400, detail=error_response("STORAGE_ERROR", str(e)))
    elif product.enhanced_image or product.original_image:
        # Load from storage
        img_path = product.enhanced_image or product.original_image
        try:
            import aiofiles
            base = storage_service.base_dir.parent
            full = base / img_path
            if full.exists():
                async with aiofiles.open(full, "rb") as f:
                    image_bytes = await f.read()
        except Exception:
            pass

    # Translate seller context to English
    seller_context = seller_text or voice_transcript or ""
    if seller_context and source_language != "en":
        trans = await translation_service.translate(seller_context, source_language, "en")
        seller_context = trans.get("translated_text", seller_context)

    # Build artisan info
    artisan_info = {
        "state": artisan.state or "",
        "experience_years": artisan.experience_years,
        "business_name": artisan.business_name or "",
    }

    # Product recognition (if image available)
    recognition = {}
    if image_bytes:
        recognition = await gemini_service.recognize_product(image_bytes)

    # Catalog generation
    catalog_data = await gemini_service.generate_catalog(
        image_bytes=image_bytes,
        recognition_result=recognition,
        seller_context=seller_context,
        artisan_info=artisan_info,
    )

    # Save/update catalog
    cat_result = await db.execute(
        select(Catalog).where(Catalog.product_id == product_id)
    )
    catalog = cat_result.scalar_one_or_none()
    if not catalog:
        catalog = Catalog(product_id=product_id)
        db.add(catalog)

    catalog.generated_title = catalog_data.get("title")
    catalog.generated_description = catalog_data.get("description")
    catalog.generated_category = catalog_data.get("category")
    catalog.generated_subcategory = catalog_data.get("subcategory")
    catalog.generated_craft_type = catalog_data.get("craft_type")
    catalog.generated_material = catalog_data.get("material")
    catalog.generated_colour = catalog_data.get("color")
    catalog.generated_tags = catalog_data.get("tags", [])
    catalog.seo_keywords = catalog_data.get("seo_keywords", [])
    catalog.source_language = source_language
    catalog.gemini_model_used = gemini_service._model_name if gemini_service.enabled else "fallback"
    catalog.raw_ai_response = catalog_data

    await db.commit()
    await db.refresh(catalog)

    return success_response(
        data={
            "catalog_id": str(catalog.catalog_id),
            "product_id": str(catalog.product_id),
            "title": catalog.generated_title,
            "description": catalog.generated_description,
            "category": catalog.generated_category,
            "subcategory": catalog.generated_subcategory,
            "craft_type": catalog.generated_craft_type,
            "material": catalog.generated_material,
            "color": catalog.generated_colour,
            "tags": catalog.generated_tags,
            "seo_keywords": catalog.seo_keywords,
            "is_ai_fallback": catalog_data.get("_fallback", False),
            "note": "Review and edit these AI-generated fields before publishing",
        },
        message="Catalog generated successfully",
    )


@router.get("/{product_id}", response_model=dict, status_code=200)
async def get_catalog(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the generated catalog for a product."""
    result = await db.execute(
        select(Catalog).where(Catalog.product_id == product_id)
    )
    catalog = result.scalar_one_or_none()
    if not catalog:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Catalog not generated yet"))

    return success_response(
        data={
            "catalog_id": str(catalog.catalog_id),
            "product_id": str(catalog.product_id),
            "title": catalog.generated_title,
            "description": catalog.generated_description,
            "category": catalog.generated_category,
            "subcategory": catalog.generated_subcategory,
            "craft_type": catalog.generated_craft_type,
            "material": catalog.generated_material,
            "color": catalog.generated_colour,
            "tags": catalog.generated_tags,
            "seo_keywords": catalog.seo_keywords,
        }
    )
