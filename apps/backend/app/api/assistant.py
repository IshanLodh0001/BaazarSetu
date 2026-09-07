"""
BaazarSetu — AI Business Assistant API
POST /api/v1/assistant/chat
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from pydantic import BaseModel

from app.core.database import get_db
from app.models.user import User
from app.models.artisan import Artisan
from app.models.product import Product, ProductStatus
from app.models.order import Order, OrderStatus
from app.models.inventory import Inventory
from app.models.review import Review
from app.utils.dependencies import get_current_user
from app.utils.response import success_response, error_response
from app.services.gemini_service import gemini_service
from app.services.translation_service import translation_service
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/assistant", tags=["AI Assistant"])


class ChatRequest(BaseModel):
    message: str
    preferred_language: Optional[str] = "en"
    conversation_history: Optional[List[dict]] = None


@router.post("/chat", response_model=dict, status_code=200)
async def chat_with_assistant(
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI Business Assistant for artisans.
    
    Can answer:
    - "What should I price this product?"
    - "How can I sell more?"
    - "Which product is selling best?"
    - "How much did I earn this month?"
    - "How many products do I have?"
    
    Retrieves REAL data from DB — never invents numbers.
    Responds in the artisan's preferred language.
    """
    if not body.message.strip():
        raise HTTPException(
            status_code=400,
            detail=error_response("VALIDATION_ERROR", "Message cannot be empty"),
        )

    # Get artisan profile
    artisan = None
    context_data = {}

    if current_user.role.value == "artisan":
        artisan_r = await db.execute(
            select(Artisan).where(Artisan.user_id == current_user.user_id)
        )
        artisan = artisan_r.scalar_one_or_none()

        if artisan:
            context_data = await _build_artisan_context(db, artisan, current_user)

    # Translate user message to English for AI if needed
    user_message = body.message
    if body.preferred_language and body.preferred_language != "en":
        trans = await translation_service.translate(
            body.message, body.preferred_language, "en"
        )
        if trans.get("success"):
            user_message = trans.get("translated_text", body.message)

    # Get AI response
    ai_response = await gemini_service.chat_assistant(
        user_message=user_message,
        context_data=context_data,
        conversation_history=body.conversation_history,
    )

    # Translate response back to preferred language
    final_response = ai_response
    if body.preferred_language and body.preferred_language != "en" and ai_response:
        trans_back = await translation_service.translate(
            ai_response, "en", body.preferred_language
        )
        if trans_back.get("success"):
            final_response = trans_back.get("translated_text", ai_response)

    return success_response(
        data={
            "response": final_response,
            "language": body.preferred_language or "en",
        },
        message="Response generated",
    )


async def _build_artisan_context(
    db: AsyncSession, artisan: Artisan, user: User
) -> dict:
    """
    Gather real artisan business data from the database.
    This is what the AI uses — no invented numbers.
    """
    # Products
    prods_r = await db.execute(
        select(Product).where(Product.seller_id == artisan.artisan_id)
    )
    products = prods_r.scalars().all()

    published = [p for p in products if p.status == ProductStatus.published]

    # Orders summary
    orders_r = await db.execute(
        select(Order).where(Order.seller_id == artisan.artisan_id)
    )
    orders = orders_r.scalars().all()
    delivered_orders = [o for o in orders if o.order_status == OrderStatus.delivered]

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    this_month_earnings = sum(
        o.total_amount
        for o in delivered_orders
        if o.order_date.month == now.month and o.order_date.year == now.year
    )

    # Best selling product
    best_product = None
    if published:
        best_product = max(published, key=lambda p: p.review_count, default=None)

    # Inventory
    low_stock = []
    for p in published:
        inv_r = await db.execute(
            select(Inventory).where(Inventory.product_id == p.product_id)
        )
        inv = inv_r.scalar_one_or_none()
        if inv and inv.available_quantity <= inv.reorder_level:
            low_stock.append({"product": p.product_name, "quantity": inv.available_quantity})

    return {
        "artisan_name": user.name or "Artisan",
        "business_name": artisan.business_name,
        "craft_type": artisan.craft_type,
        "state": artisan.state,
        "rating": artisan.rating,
        "total_products": len(products),
        "published_products": len(published),
        "total_orders": len(orders),
        "delivered_orders": len(delivered_orders),
        "this_month_earnings_inr": round(this_month_earnings, 2),
        "all_time_earnings_inr": round(sum(o.total_amount for o in delivered_orders), 2),
        "best_selling_product": best_product.product_name if best_product else None,
        "low_stock_products": low_stock,
        "product_list": [
            {
                "name": p.product_name,
                "price": p.price,
                "rating": p.rating,
                "category": p.category,
                "status": p.status,
            }
            for p in products[:10]
        ],
    }
