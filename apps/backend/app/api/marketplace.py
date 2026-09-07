"""
BaazarSetu — Marketplace API (Buyer-facing)
GET /api/v1/marketplace/products
GET /api/v1/marketplace/products/{product_id}
GET /api/v1/marketplace/categories
GET /api/v1/marketplace/artisans
GET /api/v1/marketplace/artisans/{artisan_id}
GET /api/v1/search/products
"""
import uuid
from typing import Optional, List

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc, asc

from app.core.database import get_db
from app.models.product import Product, ProductStatus
from app.models.artisan import Artisan
from app.models.user import User
from app.models.inventory import Inventory, StockStatus
from app.models.review import Review
from app.utils.dependencies import get_current_user
from app.utils.response import success_response, error_response, paginate
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/marketplace", tags=["Marketplace"])
search_router = APIRouter(prefix="/search", tags=["Search"])


# ── Product Listing ───────────────────────────────────────────────────────────

@router.get("/products", response_model=dict, status_code=200)
async def list_marketplace_products(
    q: Optional[str] = Query(None, description="Keyword search"),
    category: Optional[str] = Query(None),
    craft_type: Optional[str] = Query(None),
    material: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    sort: str = Query("newest", enum=["newest", "price_asc", "price_desc", "rating"]),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Public marketplace product listing with search, filter, sort, pagination.
    Only published products are shown.
    """
    conditions = [Product.status == ProductStatus.published]

    if q:
        search = f"%{q}%"
        conditions.append(
            or_(
                Product.product_name.ilike(search),
                Product.description.ilike(search),
                Product.category.ilike(search),
                Product.craft_type.ilike(search),
                Product.material.ilike(search),
            )
        )

    if category:
        conditions.append(Product.category.ilike(f"%{category}%"))
    if craft_type:
        conditions.append(Product.craft_type.ilike(f"%{craft_type}%"))
    if material:
        conditions.append(Product.material.ilike(f"%{material}%"))
    if min_price is not None:
        conditions.append(Product.price >= min_price)
    if max_price is not None:
        conditions.append(Product.price <= max_price)

    # Location filter via artisan join
    base_query = select(Product)
    if state:
        base_query = base_query.join(Artisan, Product.seller_id == Artisan.artisan_id)
        conditions.append(Artisan.state.ilike(f"%{state}%"))

    base_query = base_query.where(and_(*conditions))

    # Count
    count_q = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_q)
    total = total_result.scalar()

    # Sort
    if sort == "price_asc":
        base_query = base_query.order_by(asc(Product.price))
    elif sort == "price_desc":
        base_query = base_query.order_by(desc(Product.price))
    elif sort == "rating":
        base_query = base_query.order_by(desc(Product.rating))
    else:
        base_query = base_query.order_by(desc(Product.created_at))

    base_query = base_query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(base_query)
    products = result.scalars().all()

    return paginate(
        items=[_product_list_dict(p) for p in products],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get("/products/{product_id}", response_model=dict, status_code=200)
async def get_marketplace_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get full product details including artisan info and inventory."""
    result = await db.execute(
        select(Product).where(
            Product.product_id == product_id,
            Product.status == ProductStatus.published,
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Product not found"))

    # Artisan info
    artisan_result = await db.execute(
        select(Artisan).where(Artisan.artisan_id == product.seller_id)
    )
    artisan = artisan_result.scalar_one_or_none()

    # User info for artisan name
    user_info = None
    if artisan:
        user_result = await db.execute(select(User).where(User.user_id == artisan.user_id))
        user_info = user_result.scalar_one_or_none()

    # Inventory
    inv_result = await db.execute(
        select(Inventory).where(Inventory.product_id == product_id)
    )
    inventory = inv_result.scalar_one_or_none()

    # Recent reviews
    reviews_result = await db.execute(
        select(Review).where(Review.product_id == product_id)
        .order_by(desc(Review.created_at)).limit(5)
    )
    reviews = reviews_result.scalars().all()

    return success_response(
        data={
            "product": {
                **_product_detail_dict(product),
                "artisan": _artisan_public_dict(artisan, user_info) if artisan else None,
                "inventory": {
                    "available_quantity": inventory.available_quantity if inventory else 0,
                    "stock_status": inventory.stock_status if inventory else StockStatus.out_of_stock,
                } if inventory else None,
                "recent_reviews": [_review_dict(r) for r in reviews],
            }
        }
    )


# ── Categories ────────────────────────────────────────────────────────────────

@router.get("/categories", response_model=dict, status_code=200)
async def get_categories(db: AsyncSession = Depends(get_db)):
    """Get distinct categories from published products."""
    result = await db.execute(
        select(Product.category, func.count(Product.product_id).label("count"))
        .where(Product.status == ProductStatus.published, Product.category.isnot(None))
        .group_by(Product.category)
        .order_by(desc("count"))
    )
    rows = result.all()
    return success_response(
        data=[{"category": r[0], "product_count": r[1]} for r in rows]
    )


# ── Artisan Profiles ──────────────────────────────────────────────────────────

@router.get("/artisans", response_model=dict, status_code=200)
async def list_artisans(
    craft_type: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """List artisans with optional filtering."""
    conditions = [Artisan.onboarding_complete == True]
    if craft_type:
        conditions.append(Artisan.craft_type.ilike(f"%{craft_type}%"))
    if state:
        conditions.append(Artisan.state.ilike(f"%{state}%"))

    count_result = await db.execute(
        select(func.count()).where(and_(*conditions))
    )
    total = count_result.scalar()

    result = await db.execute(
        select(Artisan)
        .where(and_(*conditions))
        .order_by(desc(Artisan.rating))
        .offset((page - 1) * page_size).limit(page_size)
    )
    artisans = result.scalars().all()

    artisan_list = []
    for a in artisans:
        user_r = await db.execute(select(User).where(User.user_id == a.user_id))
        u = user_r.scalar_one_or_none()
        artisan_list.append(_artisan_public_dict(a, u))

    return paginate(items=artisan_list, page=page, page_size=page_size, total=total)


@router.get("/artisans/{artisan_id}", response_model=dict, status_code=200)
async def get_artisan_profile(
    artisan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get public artisan profile with their products."""
    artisan_result = await db.execute(
        select(Artisan).where(Artisan.artisan_id == artisan_id)
    )
    artisan = artisan_result.scalar_one_or_none()
    if not artisan:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Artisan not found"))

    user_result = await db.execute(select(User).where(User.user_id == artisan.user_id))
    user = user_result.scalar_one_or_none()

    # Published products
    prod_result = await db.execute(
        select(Product)
        .where(
            Product.seller_id == artisan_id,
            Product.status == ProductStatus.published,
        )
        .order_by(desc(Product.rating))
        .limit(20)
    )
    products = prod_result.scalars().all()

    return success_response(
        data={
            **_artisan_public_dict(artisan, user),
            "products": [_product_list_dict(p) for p in products],
        }
    )


# ── Search ────────────────────────────────────────────────────────────────────

@search_router.get("/products", response_model=dict, status_code=200)
async def search_products(
    q: str = Query(..., min_length=1, description="Search query"),
    category: Optional[str] = Query(None),
    craft_type: Optional[str] = Query(None),
    material: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Full-text keyword search across products."""
    search = f"%{q}%"
    conditions = [
        Product.status == ProductStatus.published,
        or_(
            Product.product_name.ilike(search),
            Product.description.ilike(search),
            Product.category.ilike(search),
            Product.craft_type.ilike(search),
            Product.material.ilike(search),
            Product.colour.ilike(search),
        ),
    ]
    if category:
        conditions.append(Product.category.ilike(f"%{category}%"))
    if craft_type:
        conditions.append(Product.craft_type.ilike(f"%{craft_type}%"))
    if material:
        conditions.append(Product.material.ilike(f"%{material}%"))
    if min_price is not None:
        conditions.append(Product.price >= min_price)
    if max_price is not None:
        conditions.append(Product.price <= max_price)

    base_q = select(Product)
    if state:
        base_q = base_q.join(Artisan, Product.seller_id == Artisan.artisan_id)
        conditions.append(Artisan.state.ilike(f"%{state}%"))

    base_q = base_q.where(and_(*conditions))
    count_result = await db.execute(select(func.count()).select_from(base_q.subquery()))
    total = count_result.scalar()

    products_result = await db.execute(
        base_q.order_by(desc(Product.rating))
        .offset((page - 1) * page_size).limit(page_size)
    )
    products = products_result.scalars().all()

    return paginate(
        items=[_product_list_dict(p) for p in products],
        page=page,
        page_size=page_size,
        total=total,
    )


# ── Serialization Helpers ─────────────────────────────────────────────────────

def _product_list_dict(p: Product) -> dict:
    return {
        "product_id": str(p.product_id),
        "seller_id": str(p.seller_id),
        "product_name": p.product_name,
        "category": p.category,
        "craft_type": p.craft_type,
        "material": p.material,
        "colour": p.colour,
        "price": p.price,
        "thumbnail": p.thumbnail or p.original_image,
        "rating": p.rating,
        "review_count": p.review_count,
        "status": p.status,
    }


def _product_detail_dict(p: Product) -> dict:
    return {
        **_product_list_dict(p),
        "description": p.description,
        "style": p.style,
        "estimated_size": p.estimated_size,
        "tags": p.tags,
        "seo_keywords": p.seo_keywords,
        "original_image": p.original_image,
        "enhanced_image": p.enhanced_image,
        "ai_suggested_price": p.ai_suggested_price,
        "market_min_price": p.market_min_price,
        "market_max_price": p.market_max_price,
        "is_featured": p.is_featured,
        "created_at": p.created_at.isoformat(),
    }


def _artisan_public_dict(artisan: Artisan, user: Optional[User]) -> dict:
    return {
        "artisan_id": str(artisan.artisan_id),
        "name": user.name if user else None,
        "business_name": artisan.business_name,
        "craft_type": artisan.craft_type,
        "experience_years": artisan.experience_years,
        "state": artisan.state,
        "district": artisan.district,
        "bio": artisan.bio,
        "profile_image": user.profile_image if user else None,
        "verification_status": artisan.verification_status,
        "rating": artisan.rating,
        "total_products": artisan.total_products,
    }


def _review_dict(r: Review) -> dict:
    return {
        "review_id": str(r.review_id),
        "rating": r.rating,
        "review_text": r.review_text,
        "created_at": r.created_at.isoformat(),
    }
