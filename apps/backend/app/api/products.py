"""
BaazarSetu — Products API
Full product lifecycle: create, read, update, delete, publish.
"""
import uuid
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.user import User
from app.models.artisan import Artisan
from app.models.product import Product, ProductStatus
from app.models.image import ProductImage, ProcessingStatus
from app.models.inventory import Inventory, StockStatus
from app.models.catalog import Catalog
from app.models.background_job import BackgroundJob, JobStatus
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, ProductListOut
from app.utils.dependencies import get_current_user, require_artisan
from app.utils.response import success_response, error_response, paginate
from app.services.storage_service import storage_service, StorageError
from app.services.image_service import image_processing_service
from app.services.gemini_service import gemini_service
from app.services.whisper_service import whisper_service
from app.services.translation_service import translation_service
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/products", tags=["Products"])


# ── Create Product ────────────────────────────────────────────────────────────

@router.post("", response_model=dict, status_code=201)
async def create_product(
    background_tasks: BackgroundTasks,
    image: Optional[UploadFile] = File(None, description="Product image"),
    voice_description: Optional[UploadFile] = File(None, description="Voice description audio"),
    product_name: str = Form(...),
    category: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    price: float = Form(0.0),
    material: Optional[str] = Form(None),
    colour: Optional[str] = Form(None),
    craft_type: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),  # JSON string
    preferred_language: str = Form("en"),
    run_ai: bool = Form(True),
    db: AsyncSession = Depends(get_db),
    auth: tuple = Depends(require_artisan),
):
    """
    Create a new product with optional image and voice description.
    
    Flow: Image → Storage → Product DB record → Background AI processing job.
    Returns draft product immediately; AI enrichment happens asynchronously.
    """
    current_user, artisan = auth

    # Parse tags
    tag_list: List[str] = []
    if tags:
        try:
            import json
            tag_list = json.loads(tags)
        except Exception:
            tag_list = [t.strip() for t in tags.split(",") if t.strip()]

    # Create product record
    product = Product(
        seller_id=artisan.artisan_id,
        product_name=product_name,
        category=category,
        description=description,
        material=material,
        colour=colour,
        craft_type=craft_type,
        tags=tag_list,
        price=price,
        status=ProductStatus.draft,
    )
    db.add(product)
    await db.flush()

    # Create inventory record
    inventory = Inventory(
        product_id=product.product_id,
        available_quantity=0,
        stock_status=StockStatus.out_of_stock,
    )
    db.add(inventory)

    # Save image if provided
    image_record = None
    image_bytes = None
    if image:
        try:
            image_bytes = await image.read()
            original_path = await storage_service.save_image(
                image_bytes, image.filename or "product.jpg", "originals"
            )
            image_record = ProductImage(
                product_id=product.product_id,
                uploader_id=current_user.user_id,
                original_path=original_path,
                is_primary=True,
                processing_status=ProcessingStatus.pending,
            )
            db.add(image_record)
            product.original_image = original_path
        except StorageError as e:
            logger.warning(f"Image save failed: {e}")

    await db.commit()
    await db.refresh(product)

    # Update artisan product count
    artisan.total_products += 1
    await db.commit()

    # Enqueue AI background processing
    if run_ai and (image_bytes is not None):
        job = BackgroundJob(
            user_id=current_user.user_id,
            job_type="product_ai_processing",
            status=JobStatus.pending,
            input_data={
                "product_id": str(product.product_id),
                "image_record_id": str(image_record.image_id) if image_record else None,
                "preferred_language": preferred_language,
            },
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)

        background_tasks.add_task(
            _run_product_ai_pipeline,
            str(product.product_id),
            str(image_record.image_id) if image_record else None,
            image_bytes,
            preferred_language,
            str(job.job_id),
        )

        return success_response(
            data={
                "product": ProductOut.model_validate(product).model_dump(),
                "job_id": str(job.job_id),
            },
            message="Product created. AI enrichment is running in background.",
        )

    return success_response(
        data=ProductOut.model_validate(product).model_dump(),
        message="Product created successfully",
    )


async def _run_product_ai_pipeline(
    product_id: str,
    image_record_id: Optional[str],
    image_bytes: bytes,
    preferred_language: str,
    job_id: str,
):
    """Background task: image processing → recognition → catalog generation."""
    from app.core.database import AsyncSessionLocal
    from datetime import datetime, timezone

    async with AsyncSessionLocal() as db:
        try:
            # Update job status
            job_result = await db.execute(
                select(BackgroundJob).where(BackgroundJob.job_id == uuid.UUID(job_id))
            )
            job = job_result.scalar_one_or_none()
            if job:
                job.status = JobStatus.processing
                await db.commit()

            product_result = await db.execute(
                select(Product).where(Product.product_id == uuid.UUID(product_id))
            )
            product = product_result.scalar_one_or_none()
            if not product:
                return

            # Image processing
            processed = await image_processing_service.process_product_image(image_bytes)
            processed_bytes = processed.get("processed_bytes", image_bytes)
            thumbnail_bytes = processed.get("thumbnail_bytes")

            # Save processed image
            processed_path = await storage_service.save_image(
                processed_bytes, f"proc_{product_id[:8]}.jpg", "processed"
            )
            product.enhanced_image = processed_path

            if thumbnail_bytes:
                thumb_path = await storage_service.save_image(
                    thumbnail_bytes, f"thumb_{product_id[:8]}.jpg", "processed"
                )
                product.thumbnail = thumb_path

            # Update image record
            if image_record_id:
                img_result = await db.execute(
                    select(ProductImage).where(ProductImage.image_id == uuid.UUID(image_record_id))
                )
                img_record = img_result.scalar_one_or_none()
                if img_record:
                    img_record.processed_path = processed_path
                    img_record.background_removed = processed.get("background_removed", False)
                    img_record.lighting_improved = processed.get("lighting_improved", False)
                    img_record.crop_applied = processed.get("crop_applied", False)
                    img_record.processing_status = ProcessingStatus.completed
                    img_record.processing_metadata = {
                        k: v for k, v in processed.items()
                        if k not in ("processed_bytes", "thumbnail_bytes")
                    }

            # AI product recognition
            recognition = await gemini_service.recognize_product(processed_bytes)
            product.ai_confidence = recognition.get("confidence", 0.0)

            if recognition.get("product_name") and not product.product_name:
                product.product_name = recognition["product_name"]
            if recognition.get("category") and not product.category:
                product.category = recognition["category"]
            if recognition.get("craft_type") and not product.craft_type:
                product.craft_type = recognition["craft_type"]
            if recognition.get("material") and not product.material:
                product.material = recognition["material"]
            if recognition.get("colour") and not product.colour:
                product.colour = recognition["colour"]
            if recognition.get("tags"):
                existing_tags = product.tags or []
                product.tags = list(set(existing_tags + recognition["tags"]))

            # Catalog generation
            artisan_result = await db.execute(
                select(Artisan).where(Artisan.artisan_id == product.seller_id)
            )
            artisan = artisan_result.scalar_one_or_none()
            artisan_info = {
                "state": artisan.state if artisan else "",
                "experience_years": artisan.experience_years if artisan else 0,
                "business_name": artisan.business_name if artisan else "",
            }

            catalog_data = await gemini_service.generate_catalog(
                image_bytes=processed_bytes,
                recognition_result=recognition,
                seller_context=product.description or "",
                artisan_info=artisan_info,
            )

            # Save or update catalog
            catalog_result = await db.execute(
                select(Catalog).where(Catalog.product_id == product.product_id)
            )
            catalog = catalog_result.scalar_one_or_none()
            if not catalog:
                catalog = Catalog(product_id=product.product_id)
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
            catalog.gemini_model_used = gemini_service._model_name if gemini_service.enabled else "fallback"
            catalog.raw_ai_response = catalog_data

            await db.commit()

            # Mark job complete
            if job:
                job.status = JobStatus.completed
                job.result = {
                    "product_id": product_id,
                    "recognition_confidence": recognition.get("confidence"),
                    "catalog_generated": bool(catalog_data.get("title")),
                }
                job.completed_at = datetime.now(timezone.utc)
                await db.commit()

            logger.info(f"AI pipeline complete for product {product_id}")

        except Exception as e:
            logger.error(f"AI pipeline failed for product {product_id}: {e}")
            async with AsyncSessionLocal() as error_db:
                job_r = await error_db.execute(
                    select(BackgroundJob).where(BackgroundJob.job_id == uuid.UUID(job_id))
                )
                j = job_r.scalar_one_or_none()
                if j:
                    j.status = JobStatus.failed
                    j.error_message = str(e)
                    from datetime import datetime, timezone
                    j.completed_at = datetime.now(timezone.utc)
                    await error_db.commit()


# ── Get Products (artisan's own) ──────────────────────────────────────────────

@router.get("", response_model=dict, status_code=200)
async def list_my_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[ProductStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
    auth: tuple = Depends(require_artisan),
):
    """List all products belonging to the authenticated artisan."""
    _, artisan = auth

    query = select(Product).where(Product.seller_id == artisan.artisan_id)
    if status_filter:
        query = query.where(Product.status == status_filter)

    count_q = select(func.count()).select_from(Product).where(
        Product.seller_id == artisan.artisan_id
    )
    if status_filter:
        count_q = count_q.where(Product.status == status_filter)

    total_result = await db.execute(count_q)
    total = total_result.scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    products = result.scalars().all()

    return paginate(
        items=[ProductOut.model_validate(p).model_dump() for p in products],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get("/{product_id}", response_model=dict, status_code=200)
async def get_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single product by ID. Artisans can view their own drafts; others see only published."""
    result = await db.execute(select(Product).where(Product.product_id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Product not found"))

    # Authorization: non-owners can only see published products
    if product.status != ProductStatus.published:
        from app.models.artisan import Artisan
        artisan_r = await db.execute(
            select(Artisan).where(Artisan.user_id == current_user.user_id)
        )
        artisan = artisan_r.scalar_one_or_none()
        if not artisan or artisan.artisan_id != product.seller_id:
            raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Product not found"))

    return success_response(data=ProductOut.model_validate(product).model_dump())


@router.put("/{product_id}", response_model=dict, status_code=200)
async def update_product(
    product_id: uuid.UUID,
    body: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    auth: tuple = Depends(require_artisan),
):
    """Update product details. Only the owning artisan can update."""
    _, artisan = auth
    result = await db.execute(select(Product).where(Product.product_id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Product not found"))
    if product.seller_id != artisan.artisan_id:
        raise HTTPException(status_code=403, detail=error_response("FORBIDDEN", "Not your product"))

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    await db.commit()
    await db.refresh(product)
    return success_response(data=ProductOut.model_validate(product).model_dump())


@router.post("/{product_id}/publish", response_model=dict, status_code=200)
async def publish_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    auth: tuple = Depends(require_artisan),
):
    """Publish a draft product to the marketplace."""
    _, artisan = auth
    result = await db.execute(select(Product).where(Product.product_id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Product not found"))
    if product.seller_id != artisan.artisan_id:
        raise HTTPException(status_code=403, detail=error_response("FORBIDDEN", "Not your product"))
    if not product.product_name or product.price <= 0:
        raise HTTPException(
            status_code=400,
            detail=error_response("VALIDATION_ERROR", "Product must have a name and price > 0 before publishing"),
        )

    product.status = ProductStatus.published
    await db.commit()
    return success_response(message="Product published to marketplace")


@router.delete("/{product_id}", response_model=dict, status_code=200)
async def delete_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    auth: tuple = Depends(require_artisan),
):
    """Archive (soft delete) a product."""
    _, artisan = auth
    result = await db.execute(select(Product).where(Product.product_id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Product not found"))
    if product.seller_id != artisan.artisan_id:
        raise HTTPException(status_code=403, detail=error_response("FORBIDDEN", "Not your product"))

    product.status = ProductStatus.archived
    artisan.total_products = max(0, artisan.total_products - 1)
    await db.commit()
    return success_response(message="Product archived")


# ── Job Status ────────────────────────────────────────────────────────────────

@router.get("/jobs/{job_id}", response_model=dict, status_code=200)
async def get_job_status(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Poll the status of a background AI processing job."""
    result = await db.execute(
        select(BackgroundJob).where(
            BackgroundJob.job_id == job_id,
            BackgroundJob.user_id == current_user.user_id,
        )
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Job not found"))

    return success_response(
        data={
            "job_id": str(job.job_id),
            "job_type": job.job_type,
            "status": job.status,
            "result": job.result,
            "error_message": job.error_message,
            "created_at": job.created_at.isoformat(),
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        }
    )
