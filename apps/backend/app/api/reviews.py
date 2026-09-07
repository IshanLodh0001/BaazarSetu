"""
BaazarSetu — Reviews API
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.core.database import get_db
from app.models.review import Review
from app.models.product import Product, ProductStatus
from app.models.buyer import Buyer
from app.utils.dependencies import require_buyer
from app.utils.response import success_response, error_response, paginate
from app.schemas.schemas import ReviewCreate, ReviewOut

router = APIRouter(prefix="/products", tags=["Reviews"])


@router.post("/{product_id}/reviews", response_model=dict, status_code=201)
async def create_review(
    product_id: uuid.UUID,
    body: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    auth: tuple = Depends(require_buyer),
):
    """Submit a review for a purchased product. One review per buyer per product."""
    _, buyer = auth

    # Product must be published
    prod_r = await db.execute(
        select(Product).where(
            Product.product_id == product_id,
            Product.status == ProductStatus.published,
        )
    )
    product = prod_r.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Product not found"))

    # Check for duplicate review
    existing_r = await db.execute(
        select(Review).where(
            Review.buyer_id == buyer.buyer_id,
            Review.product_id == product_id,
        )
    )
    if existing_r.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=error_response("DUPLICATE_REVIEW", "You have already reviewed this product"),
        )

    review = Review(
        buyer_id=buyer.buyer_id,
        product_id=product_id,
        order_id=body.order_id,
        rating=body.rating,
        review_text=body.review_text,
    )
    db.add(review)
    await db.flush()

    # Recalculate product rating
    avg_result = await db.execute(
        select(func.avg(Review.rating)).where(Review.product_id == product_id)
    )
    count_result = await db.execute(
        select(func.count(Review.review_id)).where(Review.product_id == product_id)
    )
    product.rating = round(float(avg_result.scalar() or 0), 2)
    product.review_count = count_result.scalar() or 0

    await db.commit()
    await db.refresh(review)

    return success_response(
        data=ReviewOut.model_validate(review).model_dump(),
        message="Review submitted",
    )


@router.get("/{product_id}/reviews", response_model=dict, status_code=200)
async def list_reviews(
    product_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List reviews for a product."""
    count_r = await db.execute(
        select(func.count(Review.review_id)).where(Review.product_id == product_id)
    )
    total = count_r.scalar()

    result = await db.execute(
        select(Review).where(Review.product_id == product_id)
        .order_by(desc(Review.created_at))
        .offset((page - 1) * page_size).limit(page_size)
    )
    reviews = result.scalars().all()

    # Stats
    avg_r = await db.execute(
        select(func.avg(Review.rating)).where(Review.product_id == product_id)
    )
    avg_rating = round(float(avg_r.scalar() or 0), 2)

    return {
        **paginate(
            items=[ReviewOut.model_validate(r).model_dump() for r in reviews],
            page=page, page_size=page_size, total=total,
        ),
        "average_rating": avg_rating,
    }
