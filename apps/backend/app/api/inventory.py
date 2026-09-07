"""
BaazarSetu — Inventory API
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.models.inventory import Inventory, StockStatus
from app.models.product import Product
from app.utils.dependencies import require_artisan
from app.utils.response import success_response, error_response, paginate
from app.schemas.schemas import InventoryUpdate, InventoryOut

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("", response_model=dict)
async def get_inventory(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    stock_status: StockStatus = Query(None),
    db: AsyncSession = Depends(get_db),
    auth: tuple = Depends(require_artisan),
):
    """Get inventory for all artisan's products."""
    _, artisan = auth

    query = (
        select(Inventory)
        .join(Product, Inventory.product_id == Product.product_id)
        .where(Product.seller_id == artisan.artisan_id)
    )
    if stock_status:
        query = query.where(Inventory.stock_status == stock_status)

    from sqlalchemy import func
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size))
    items = result.scalars().all()

    return paginate(
        items=[InventoryOut.model_validate(i).model_dump() for i in items],
        page=page, page_size=page_size, total=total,
    )


@router.patch("/{product_id}", response_model=dict)
async def update_inventory(
    product_id: uuid.UUID,
    body: InventoryUpdate,
    db: AsyncSession = Depends(get_db),
    auth: tuple = Depends(require_artisan),
):
    """Update inventory quantity for a product. Artisans only."""
    _, artisan = auth

    prod_r = await db.execute(
        select(Product).where(
            Product.product_id == product_id,
            Product.seller_id == artisan.artisan_id,
        )
    )
    if not prod_r.scalar_one_or_none():
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Product not found"))

    inv_r = await db.execute(select(Inventory).where(Inventory.product_id == product_id))
    inv = inv_r.scalar_one_or_none()
    if not inv:
        inv = Inventory(product_id=product_id)
        db.add(inv)

    if body.available_quantity is not None:
        inv.available_quantity = body.available_quantity
    if body.reorder_level is not None:
        inv.reorder_level = body.reorder_level

    # Recalculate status
    if inv.available_quantity <= 0:
        inv.stock_status = StockStatus.out_of_stock
    elif inv.available_quantity <= inv.reorder_level:
        inv.stock_status = StockStatus.low_stock
    else:
        inv.stock_status = StockStatus.in_stock

    await db.commit()
    await db.refresh(inv)
    return success_response(
        data=InventoryOut.model_validate(inv).model_dump(),
        message="Inventory updated",
    )
