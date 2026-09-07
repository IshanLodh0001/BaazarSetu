"""
BaazarSetu — Cart API
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.cart import Cart, CartItem
from app.models.product import Product, ProductStatus
from app.models.inventory import Inventory
from app.utils.dependencies import require_buyer
from app.utils.response import success_response, error_response
from app.schemas.schemas import AddToCartRequest, UpdateCartItemRequest

router = APIRouter(prefix="/cart", tags=["Cart"])


async def _get_or_create_cart(db: AsyncSession, buyer_id: uuid.UUID) -> Cart:
    result = await db.execute(select(Cart).where(Cart.buyer_id == buyer_id))
    cart = result.scalar_one_or_none()
    if not cart:
        cart = Cart(buyer_id=buyer_id, total_items=0, subtotal=0.0)
        db.add(cart)
        await db.flush()
    return cart


async def _recalculate_cart(db: AsyncSession, cart: Cart) -> None:
    result = await db.execute(select(CartItem).where(CartItem.cart_id == cart.cart_id))
    items = result.scalars().all()
    cart.total_items = sum(i.quantity for i in items)
    cart.subtotal = round(sum(i.total_price for i in items), 2)


@router.get("", response_model=dict)
async def get_cart(
    db: AsyncSession = Depends(get_db),
    auth: tuple = Depends(require_buyer),
):
    """Get the buyer's cart with all items."""
    _, buyer = auth
    cart = await _get_or_create_cart(db, buyer.buyer_id)
    await db.commit()

    items_result = await db.execute(
        select(CartItem).where(CartItem.cart_id == cart.cart_id)
    )
    items = items_result.scalars().all()

    shipping = 50.0 if cart.subtotal < 500 else 0.0  # Free shipping over ₹500

    return success_response(
        data={
            "cart_id": str(cart.cart_id),
            "buyer_id": str(buyer.buyer_id),
            "total_items": cart.total_items,
            "subtotal": cart.subtotal,
            "shipping_charge": shipping,
            "total": cart.subtotal + shipping,
            "items": [
                {
                    "cart_item_id": str(i.cart_item_id),
                    "product_id": str(i.product_id),
                    "quantity": i.quantity,
                    "unit_price": i.unit_price,
                    "total_price": i.total_price,
                }
                for i in items
            ],
        }
    )


@router.post("", response_model=dict, status_code=201)
async def add_to_cart(
    body: AddToCartRequest,
    db: AsyncSession = Depends(get_db),
    auth: tuple = Depends(require_buyer),
):
    """Add a product to the buyer's cart. Validates stock availability."""
    _, buyer = auth

    # Validate product
    prod_result = await db.execute(
        select(Product).where(
            Product.product_id == body.product_id,
            Product.status == ProductStatus.published,
        )
    )
    product = prod_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Product not found"))

    # Check inventory
    inv_result = await db.execute(
        select(Inventory).where(Inventory.product_id == body.product_id)
    )
    inventory = inv_result.scalar_one_or_none()
    if not inventory or inventory.available_quantity < body.quantity:
        raise HTTPException(
            status_code=400,
            detail=error_response("OUT_OF_STOCK", f"Only {inventory.available_quantity if inventory else 0} units available"),
        )

    cart = await _get_or_create_cart(db, buyer.buyer_id)

    # Check if item already in cart
    existing_result = await db.execute(
        select(CartItem).where(
            CartItem.cart_id == cart.cart_id,
            CartItem.product_id == body.product_id,
        )
    )
    existing = existing_result.scalar_one_or_none()

    if existing:
        new_qty = existing.quantity + body.quantity
        if inventory.available_quantity < new_qty:
            raise HTTPException(
                status_code=400,
                detail=error_response("OUT_OF_STOCK", "Requested quantity exceeds available stock"),
            )
        existing.quantity = new_qty
        existing.total_price = round(existing.unit_price * new_qty, 2)
    else:
        item = CartItem(
            cart_id=cart.cart_id,
            product_id=body.product_id,
            quantity=body.quantity,
            unit_price=product.price,
            total_price=round(product.price * body.quantity, 2),
        )
        db.add(item)

    await _recalculate_cart(db, cart)
    await db.commit()
    return success_response(message="Item added to cart")


@router.patch("/items/{product_id}", response_model=dict)
async def update_cart_item(
    product_id: uuid.UUID,
    body: UpdateCartItemRequest,
    db: AsyncSession = Depends(get_db),
    auth: tuple = Depends(require_buyer),
):
    """Update quantity of a cart item."""
    _, buyer = auth
    cart = await _get_or_create_cart(db, buyer.buyer_id)

    item_result = await db.execute(
        select(CartItem).where(
            CartItem.cart_id == cart.cart_id,
            CartItem.product_id == product_id,
        )
    )
    item = item_result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Item not in cart"))

    # Validate stock
    inv_result = await db.execute(select(Inventory).where(Inventory.product_id == product_id))
    inventory = inv_result.scalar_one_or_none()
    if not inventory or inventory.available_quantity < body.quantity:
        raise HTTPException(status_code=400, detail=error_response("OUT_OF_STOCK", "Insufficient stock"))

    item.quantity = body.quantity
    item.total_price = round(item.unit_price * body.quantity, 2)
    await _recalculate_cart(db, cart)
    await db.commit()
    return success_response(message="Cart updated")


@router.delete("/items/{product_id}", response_model=dict)
async def remove_from_cart(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    auth: tuple = Depends(require_buyer),
):
    """Remove an item from the cart."""
    _, buyer = auth
    cart = await _get_or_create_cart(db, buyer.buyer_id)

    item_result = await db.execute(
        select(CartItem).where(
            CartItem.cart_id == cart.cart_id,
            CartItem.product_id == product_id,
        )
    )
    item = item_result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Item not in cart"))

    await db.delete(item)
    await _recalculate_cart(db, cart)
    await db.commit()
    return success_response(message="Item removed from cart")
