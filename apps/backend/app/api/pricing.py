"""
BaazarSetu — Pricing API
POST /api/v1/pricing/recommend
GET  /api/v1/pricing/{product_id}/history
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.models.product import Product
from app.models.pricing import PricingRecord
from app.models.market_data import MarketData
from app.models.order import Order, OrderStatus
from app.utils.dependencies import require_artisan
from app.utils.response import success_response, error_response
from app.services.pricing_service import pricing_service
from app.services.gemini_service import gemini_service
from app.schemas.schemas import PricingRequest
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/pricing", tags=["Pricing"])


@router.post("/recommend", response_model=dict, status_code=200)
async def recommend_price(
    body: PricingRequest,
    db: AsyncSession = Depends(get_db),
    auth: tuple = Depends(require_artisan),
):
    """
    Generate price recommendation using XGBoost / fallback algorithm.
    
    Combines:
    - Product information (category, craft type, material)
    - Input costs (material, labour, packaging, transport)
    - Market data (historical prices, demand)
    - Historical sales data
    
    Returns minimum, suggested, maximum price with explanation.
    """
    _, artisan = auth

    # Verify product ownership
    prod_result = await db.execute(
        select(Product).where(
            Product.product_id == body.product_id,
            Product.seller_id == artisan.artisan_id,
        )
    )
    product = prod_result.scalar_one_or_none()
    if not product:
        raise HTTPException(
            status_code=404,
            detail=error_response("NOT_FOUND", "Product not found or not yours"),
        )

    # Fetch market data
    market_query = select(MarketData)
    filters = []
    if product.category:
        filters.append(MarketData.category.ilike(f"%{product.category}%"))
    if product.craft_type:
        filters.append(MarketData.craft_type.ilike(f"%{product.craft_type}%"))

    if filters:
        from sqlalchemy import or_
        market_result = await db.execute(
            market_query.where(or_(*filters)).order_by(desc(MarketData.data_date)).limit(5)
        )
        market_rows = market_result.scalars().all()
    else:
        market_rows = []

    market_data = None
    if market_rows:
        avg_prices = [r.average_price for r in market_rows]
        market_data = {
            "average_price": sum(avg_prices) / len(avg_prices),
            "min_price": min(r.min_price for r in market_rows),
            "max_price": max(r.max_price for r in market_rows),
            "demand_score": market_rows[0].demand_score,
        }

    # Historical sales
    orders_result = await db.execute(
        select(Order).where(
            Order.seller_id == artisan.artisan_id,
            Order.order_status == OrderStatus.delivered,
        ).limit(50)
    )
    historical_sales = [
        {"amount": o.total_amount} for o in orders_result.scalars().all()
    ]

    product_info = {
        "category": product.category,
        "craft_type": product.craft_type,
        "material": product.material,
    }
    cost_data = {
        "raw_material_cost": body.raw_material_cost,
        "labour_cost": body.labour_cost,
        "packaging_cost": body.packaging_cost,
        "transport_cost": body.transport_cost,
        "production_time_hours": body.production_time_hours,
        "quantity": body.quantity,
    }

    result = await pricing_service.recommend_price(
        product_info=product_info,
        cost_data=cost_data,
        market_data=market_data,
        historical_sales=historical_sales or None,
    )

    # Generate explanation (try Gemini first, fallback to deterministic)
    explanation = await gemini_service.generate_pricing_explanation(
        cost_data=cost_data,
        market_data=market_data or {},
        pricing_result=result,
    )
    if not explanation or explanation.startswith("I'm having trouble"):
        explanation = pricing_service.build_explanation(cost_data, market_data, result)

    result["explanation"] = explanation

    # Persist pricing record
    pricing_record = PricingRecord(
        product_id=body.product_id,
        raw_material_cost=body.raw_material_cost,
        labour_cost=body.labour_cost,
        packaging_cost=body.packaging_cost,
        transport_cost=body.transport_cost,
        production_time_hours=body.production_time_hours,
        quantity=body.quantity,
        location=body.location,
        total_cost=result.get("total_cost", 0),
        market_average_price=result.get("market_average_price"),
        market_min_price=market_data.get("min_price") if market_data else None,
        market_max_price=market_data.get("max_price") if market_data else None,
        minimum_price=result["minimum_price"],
        suggested_price=result["suggested_price"],
        maximum_price=result["maximum_price"],
        expected_profit=result["expected_profit"],
        profit_margin=result["profit_margin"],
        confidence=result["confidence"],
        pricing_reason=explanation,
        model_used=result["model_used"],
    )
    db.add(pricing_record)

    # Update product suggested price
    product.ai_suggested_price = result["suggested_price"]
    product.market_min_price = result.get("minimum_price")
    product.market_max_price = result.get("maximum_price")

    await db.commit()
    await db.refresh(pricing_record)

    return success_response(
        data={
            "pricing_id": str(pricing_record.pricing_id),
            "product_id": str(body.product_id),
            "minimum_price": result["minimum_price"],
            "suggested_price": result["suggested_price"],
            "maximum_price": result["maximum_price"],
            "expected_profit": result["expected_profit"],
            "profit_margin": result["profit_margin"],
            "market_average_price": result.get("market_average_price"),
            "confidence": result["confidence"],
            "explanation": explanation,
            "model_used": result["model_used"],
        },
        message="Price recommendation generated",
    )


@router.get("/{product_id}/history", response_model=dict, status_code=200)
async def pricing_history(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    auth: tuple = Depends(require_artisan),
):
    """Get pricing recommendation history for a product."""
    _, artisan = auth

    # Verify ownership
    prod_result = await db.execute(
        select(Product).where(
            Product.product_id == product_id,
            Product.seller_id == artisan.artisan_id,
        )
    )
    if not prod_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Product not found"))

    records = await db.execute(
        select(PricingRecord)
        .where(PricingRecord.product_id == product_id)
        .order_by(desc(PricingRecord.created_at))
        .limit(10)
    )

    return success_response(
        data=[
            {
                "pricing_id": str(r.pricing_id),
                "suggested_price": r.suggested_price,
                "minimum_price": r.minimum_price,
                "maximum_price": r.maximum_price,
                "profit_margin": r.profit_margin,
                "model_used": r.model_used,
                "created_at": r.created_at.isoformat(),
            }
            for r in records.scalars().all()
        ]
    )
