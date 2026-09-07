"""
BaazarSetu — Matching API (B2B Artisan Matching)
POST /api/v1/matching/find-artisans
"""
from typing import Optional
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.models.artisan import Artisan
from app.models.product import Product, ProductStatus
from app.models.inventory import Inventory
from app.models.user import User
from app.utils.dependencies import require_buyer
from app.utils.response import success_response, error_response
from app.services.matching_service import matching_service
from app.schemas.schemas import MatchRequest
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/matching", tags=["B2B Matching"])


@router.post("/find-artisans", response_model=dict, status_code=200)
async def find_matching_artisans(
    body: MatchRequest,
    db: AsyncSession = Depends(get_db),
    auth: tuple = Depends(require_buyer),
):
    """
    Find and rank artisans matching a buyer's B2B requirement.
    
    Matching considers:
    - Craft type
    - Product category
    - Location
    - Available inventory
    - Rating
    - Price compatibility
    
    Returns ranked artisans with match score and reason.
    """
    _, buyer = auth

    # Fetch all eligible artisans
    artisan_result = await db.execute(
        select(Artisan).where(Artisan.onboarding_complete == True)
    )
    artisans = artisan_result.scalars().all()

    request_dict = body.model_dump()
    matches = []

    for artisan in artisans:
        # Get artisan's published products
        prod_result = await db.execute(
            select(Product).where(
                Product.seller_id == artisan.artisan_id,
                Product.status == ProductStatus.published,
            )
        )
        products = prod_result.scalars().all()

        # Get inventory
        prod_ids = [p.product_id for p in products]
        if prod_ids:
            inv_result = await db.execute(
                select(Inventory).where(Inventory.product_id.in_(prod_ids))
            )
            inventory = inv_result.scalars().all()
        else:
            inventory = []

        artisan_dict = {
            "artisan_id": str(artisan.artisan_id),
            "business_name": artisan.business_name,
            "craft_type": artisan.craft_type,
            "state": artisan.state,
            "district": artisan.district,
            "rating": artisan.rating,
            "production_capacity": artisan.production_capacity,
        }
        products_list = [
            {"category": p.category, "price": p.price, "craft_type": p.craft_type}
            for p in products
        ]
        inventory_list = [
            {"available_quantity": i.available_quantity} for i in inventory
        ]

        score_result = matching_service.score_artisan(
            artisan_dict, products_list, inventory_list, request_dict
        )
        matches.append(score_result)

    ranked = matching_service.rank_matches(matches)

    return success_response(
        data={
            "matches": ranked[:20],  # Return top 20
            "total_found": len(ranked),
        },
        message=f"Found {len(ranked)} matching artisans",
    )
