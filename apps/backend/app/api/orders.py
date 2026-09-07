"""
BaazarSetu — Orders API
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_

from app.core.database import get_db
from app.models.cart import Cart, CartItem
from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus
from app.models.inventory import Inventory, StockStatus
from app.models.notification import Notification, NotificationType
from app.models.artisan import Artisan
from app.models.buyer import Buyer
from app.models.product import Product
from app.models.user import User, UserRole
from app.utils.dependencies import get_current_user, require_buyer
from app.utils.response import success_response, error_response, paginate
from app.schemas.schemas import OrderCreate, OrderOut

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("", response_model=dict, status_code=201)
async def create_order(
    body: OrderCreate,
    db: AsyncSession = Depends(get_db),
    auth: tuple = Depends(require_buyer),
):
    """
    Create order from cart.
    - Validates stock for all items
    - Creates order + order items per seller
    - Reserves inventory
    - Clears cart
    """
    _, buyer = auth

    cart_result = await db.execute(select(Cart).where(Cart.buyer_id == buyer.buyer_id))
    cart = cart_result.scalar_one_or_none()
    if not cart or cart.total_items == 0:
        raise HTTPException(status_code=400, detail=error_response("CART_EMPTY", "Cart is empty"))

    items_result = await db.execute(
        select(CartItem).where(CartItem.cart_id == cart.cart_id)
    )
    items = items_result.scalars().all()

    # Validate stock for all items
    for item in items:
        inv_r = await db.execute(
            select(Inventory).where(Inventory.product_id == item.product_id)
        )
        inv = inv_r.scalar_one_or_none()
        if not inv or inv.available_quantity < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=error_response(
                    "OUT_OF_STOCK",
                    f"Product {item.product_id} has insufficient stock",
                ),
            )

    # Group items by seller
    seller_groups: dict = {}
    for item in items:
        prod_r = await db.execute(select(Product).where(Product.product_id == item.product_id))
        product = prod_r.scalar_one_or_none()
        if not product:
            continue
        seller_id = str(product.seller_id)
        if seller_id not in seller_groups:
            seller_groups[seller_id] = []
        seller_groups[seller_id].append((item, product))

    created_orders = []
    shipping_per_order = 50.0

    for seller_id_str, group in seller_groups.items():
        seller_id = uuid.UUID(seller_id_str)
        subtotal = sum(i.total_price for i, _ in group)
        shipping = 0.0 if subtotal >= 500 else shipping_per_order
        total = subtotal + shipping

        order = Order(
            buyer_id=buyer.buyer_id,
            seller_id=seller_id,
            total_quantity=sum(i.quantity for i, _ in group),
            subtotal=subtotal,
            shipping_charge=shipping,
            total_amount=total,
            payment_status=PaymentStatus.pending,
            order_status=OrderStatus.pending,
            shipping_address=body.shipping_address,
            notes=body.notes,
        )
        db.add(order)
        await db.flush()

        for item, product in group:
            order_item = OrderItem(
                order_id=order.order_id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item.total_price,
            )
            db.add(order_item)

            # Reserve inventory
            inv_r = await db.execute(
                select(Inventory).where(Inventory.product_id == item.product_id)
            )
            inv = inv_r.scalar_one_or_none()
            if inv:
                inv.available_quantity -= item.quantity
                inv.reserved_quantity += item.quantity
                if inv.available_quantity <= 0:
                    inv.stock_status = StockStatus.out_of_stock
                    product.status = "out_of_stock"
                elif inv.available_quantity <= inv.reorder_level:
                    inv.stock_status = StockStatus.low_stock

        # Notify seller
        artisan_r = await db.execute(select(Artisan).where(Artisan.artisan_id == seller_id))
        artisan = artisan_r.scalar_one_or_none()
        if artisan:
            notif = Notification(
                user_id=artisan.user_id,
                title="New Order",
                message=f"You have a new order for ₹{total:.0f}.",
                notification_type=NotificationType.order,
                reference_id=str(order.order_id),
            )
            db.add(notif)
            artisan.total_orders += 1

        created_orders.append(str(order.order_id))

    # Clear cart
    for item in items:
        await db.delete(item)
    cart.total_items = 0
    cart.subtotal = 0.0

    await db.commit()

    return success_response(
        data={"order_ids": created_orders},
        message=f"{len(created_orders)} order(s) created successfully",
    )


@router.get("", response_model=dict, status_code=200)
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[OrderStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List orders for the current user (buyer or artisan)."""
    conditions = []
    if current_user.role == UserRole.buyer:
        buyer_r = await db.execute(select(Buyer).where(Buyer.user_id == current_user.user_id))
        buyer = buyer_r.scalar_one_or_none()
        if not buyer:
            raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Buyer profile not found"))
        conditions.append(Order.buyer_id == buyer.buyer_id)
    else:
        artisan_r = await db.execute(select(Artisan).where(Artisan.user_id == current_user.user_id))
        artisan = artisan_r.scalar_one_or_none()
        if not artisan:
            raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Artisan profile not found"))
        conditions.append(Order.seller_id == artisan.artisan_id)

    if status:
        conditions.append(Order.order_status == status)

    count_r = await db.execute(select(func.count()).where(and_(*conditions)))
    total = count_r.scalar()

    orders_r = await db.execute(
        select(Order).where(and_(*conditions))
        .order_by(desc(Order.order_date))
        .offset((page - 1) * page_size).limit(page_size)
    )
    orders = orders_r.scalars().all()

    return paginate(
        items=[_order_dict(o) for o in orders],
        page=page, page_size=page_size, total=total,
    )


@router.get("/{order_id}", response_model=dict, status_code=200)
async def get_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get order details with items."""
    result = await db.execute(select(Order).where(Order.order_id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Order not found"))

    # Authorization
    await _authorize_order(db, current_user, order)

    items_r = await db.execute(select(OrderItem).where(OrderItem.order_id == order_id))
    items = items_r.scalars().all()

    return success_response(
        data={**_order_dict(order), "items": [_order_item_dict(i) for i in items]}
    )


@router.patch("/{order_id}/status", response_model=dict, status_code=200)
async def update_order_status(
    order_id: uuid.UUID,
    new_status: OrderStatus,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update order status.
    Artisans can: confirmed → processing → shipped.
    Buyers can: cancel pending orders.
    """
    result = await db.execute(select(Order).where(Order.order_id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Order not found"))

    await _authorize_order(db, current_user, order)

    if current_user.role == UserRole.artisan:
        allowed = {OrderStatus.confirmed, OrderStatus.processing, OrderStatus.shipped, OrderStatus.delivered}
        if new_status not in allowed:
            raise HTTPException(
                status_code=400,
                detail=error_response("INVALID_STATUS", "Artisans can only confirm/process/ship/deliver orders")
            )
        # Handle inventory on delivery
        if new_status == OrderStatus.delivered:
            items_r = await db.execute(select(OrderItem).where(OrderItem.order_id == order_id))
            for item in items_r.scalars().all():
                inv_r = await db.execute(select(Inventory).where(Inventory.product_id == item.product_id))
                inv = inv_r.scalar_one_or_none()
                if inv:
                    inv.reserved_quantity = max(0, inv.reserved_quantity - item.quantity)
                    inv.sold_quantity += item.quantity
    elif current_user.role == UserRole.buyer:
        if new_status != OrderStatus.cancelled or order.order_status != OrderStatus.pending:
            raise HTTPException(
                status_code=400,
                detail=error_response("INVALID_STATUS", "Buyers can only cancel pending orders")
            )
        # Release reserved inventory on cancel
        items_r = await db.execute(select(OrderItem).where(OrderItem.order_id == order_id))
        for item in items_r.scalars().all():
            inv_r = await db.execute(select(Inventory).where(Inventory.product_id == item.product_id))
            inv = inv_r.scalar_one_or_none()
            if inv:
                inv.available_quantity += item.quantity
                inv.reserved_quantity = max(0, inv.reserved_quantity - item.quantity)
                if inv.available_quantity > 0:
                    inv.stock_status = StockStatus.in_stock

    order.order_status = new_status
    await db.commit()
    return success_response(message=f"Order status updated to {new_status}")


async def _authorize_order(db: AsyncSession, user: User, order: Order) -> None:
    if user.role == UserRole.buyer:
        buyer_r = await db.execute(select(Buyer).where(Buyer.user_id == user.user_id))
        buyer = buyer_r.scalar_one_or_none()
        if not buyer or buyer.buyer_id != order.buyer_id:
            raise HTTPException(status_code=403, detail=error_response("FORBIDDEN", "Not your order"))
    else:
        artisan_r = await db.execute(select(Artisan).where(Artisan.user_id == user.user_id))
        artisan = artisan_r.scalar_one_or_none()
        if not artisan or artisan.artisan_id != order.seller_id:
            raise HTTPException(status_code=403, detail=error_response("FORBIDDEN", "Not your order"))


def _order_dict(o: Order) -> dict:
    return {
        "order_id": str(o.order_id),
        "buyer_id": str(o.buyer_id),
        "seller_id": str(o.seller_id),
        "total_quantity": o.total_quantity,
        "subtotal": o.subtotal,
        "shipping_charge": o.shipping_charge,
        "total_amount": o.total_amount,
        "payment_status": o.payment_status,
        "order_status": o.order_status,
        "tracking_number": o.tracking_number,
        "order_date": o.order_date.isoformat(),
    }


def _order_item_dict(i: OrderItem) -> dict:
    return {
        "order_item_id": str(i.order_item_id),
        "product_id": str(i.product_id),
        "quantity": i.quantity,
        "unit_price": i.unit_price,
        "total_price": i.total_price,
    }
