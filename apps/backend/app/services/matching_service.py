"""
BaazarSetu — Matching Service
Rule-based B2B artisan-buyer matching with optional CLIP visual similarity.
"""
import asyncio
from typing import List, Dict, Any, Optional
from datetime import date

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class MatchingService:
    """
    Rule-based scoring for B2B artisan matching.
    Score components:
    - Craft type match (30%)
    - Category match (20%)
    - Location proximity (15%)
    - Inventory availability (15%)
    - Rating (10%)
    - Price compatibility (10%)
    """

    def score_artisan(
        self,
        artisan: Dict[str, Any],
        artisan_products: List[Dict[str, Any]],
        artisan_inventory: List[Dict[str, Any]],
        request: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Score a single artisan against a buyer match request.
        Returns score 0.0–1.0 and reason.
        """
        score = 0.0
        reasons = []

        craft_req = (request.get("craft_type") or "").lower()
        category_req = (request.get("product_category") or "").lower()
        location_req = (request.get("location") or "").lower()
        budget = request.get("budget")
        required_qty = request.get("required_quantity", 1)

        artisan_craft = (artisan.get("craft_type") or "").lower()
        artisan_state = (artisan.get("state") or "").lower()

        # ── Craft type match (0.30) ───────────────────────────────────────────
        if craft_req and artisan_craft:
            if craft_req == artisan_craft:
                score += 0.30
                reasons.append(f"Exact craft match: {artisan_craft}")
            elif craft_req in artisan_craft or artisan_craft in craft_req:
                score += 0.15
                reasons.append(f"Partial craft match: {artisan_craft}")

        # ── Category match via products (0.20) ────────────────────────────────
        if category_req and artisan_products:
            cats = {(p.get("category") or "").lower() for p in artisan_products}
            if category_req in cats:
                score += 0.20
                reasons.append(f"Has products in {category_req}")
            elif any(category_req in c for c in cats):
                score += 0.10

        # ── Location proximity (0.15) ─────────────────────────────────────────
        if location_req:
            if artisan_state and (
                location_req in artisan_state or artisan_state in location_req
            ):
                score += 0.15
                reasons.append(f"Located in {artisan_state}")
            elif artisan.get("district") and location_req in (artisan.get("district") or "").lower():
                score += 0.10

        # ── Inventory availability (0.15) ─────────────────────────────────────
        total_avail = sum(i.get("available_quantity", 0) for i in artisan_inventory)
        if total_avail >= required_qty:
            score += 0.15
            reasons.append(f"Has {total_avail} units available")
        elif total_avail > 0:
            score += 0.07 * (total_avail / required_qty)

        # ── Rating (0.10) ─────────────────────────────────────────────────────
        rating = float(artisan.get("rating", 0))
        score += 0.10 * (rating / 5.0)
        if rating >= 4.0:
            reasons.append(f"High rating: {rating:.1f}/5")

        # ── Price compatibility (0.10) ────────────────────────────────────────
        if budget and artisan_products:
            prices = [p.get("price", 0) for p in artisan_products if p.get("price")]
            if prices:
                avg_price = sum(prices) / len(prices)
                budget_per_unit = budget / required_qty
                if avg_price <= budget_per_unit:
                    score += 0.10
                    reasons.append(f"Avg price ₹{avg_price:.0f} fits budget")
                elif avg_price <= budget_per_unit * 1.2:
                    score += 0.05

        # Estimate available quantity and price
        estimated_price = None
        if artisan_products:
            prices = [p.get("price", 0) for p in artisan_products if p.get("price")]
            estimated_price = sum(prices) / len(prices) if prices else None

        match_reason = "; ".join(reasons) if reasons else "General match based on profile"

        return {
            "artisan_id": artisan.get("artisan_id"),
            "business_name": artisan.get("business_name"),
            "craft_type": artisan.get("craft_type"),
            "state": artisan.get("state"),
            "district": artisan.get("district"),
            "rating": rating,
            "match_score": round(min(score, 1.0), 3),
            "match_reason": match_reason,
            "estimated_price": estimated_price,
            "available_quantity": total_avail,
        }

    def rank_matches(
        self, matches: List[Dict[str, Any]], min_score: float = 0.1
    ) -> List[Dict[str, Any]]:
        """Filter and sort matches by score descending."""
        filtered = [m for m in matches if m["match_score"] >= min_score]
        return sorted(filtered, key=lambda x: x["match_score"], reverse=True)


matching_service = MatchingService()
