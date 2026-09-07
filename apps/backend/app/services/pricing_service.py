"""
BaazarSetu — Dynamic Pricing Service
Primary: XGBoost model (if trained model exists).
Fallback: Deterministic cost-plus + market algorithm.
"""
import asyncio
import os
from pathlib import Path
from typing import Optional, Dict, Any, List

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Category markup multipliers (fallback algorithm)
CATEGORY_MARKUP = {
    "textiles": 2.5, "pottery": 2.8, "jewelry": 3.5, "woodwork": 2.3,
    "paintings": 3.0, "leather": 2.4, "metalwork": 2.6, "basketry": 2.2,
    "carpets": 2.7, "embroidery": 3.2, "default": 2.5,
}

# Labour rate per hour (INR) by craft type
LABOUR_RATE = {
    "banarasi": 120, "chikankari": 80, "madhubani": 100, "warli": 90,
    "dhokra": 110, "channapatna": 85, "kondapalli": 95, "default": 80,
}

# Quality multipliers
QUALITY_MULTIPLIERS = {"premium": 1.3, "standard": 1.0, "budget": 0.85}


class PricingService:
    """
    Dynamic pricing engine.
    
    Flow:
    1. Try XGBoost model (if trained model file exists)
    2. Fall back to deterministic cost-plus algorithm
    3. Always clamp to safe min/max bounds
    4. Always generate human-readable explanation
    """

    def __init__(self) -> None:
        self._model = None
        self._model_loaded = False
        self._use_fallback = settings.PRICING_USE_FALLBACK
        self._model_path = Path(settings.XGBOOST_MODEL_PATH)
        logger.info(
            f"PricingService init: model_path={self._model_path} "
            f"use_fallback={self._use_fallback}"
        )

    def _load_model(self):
        """Lazily load XGBoost model."""
        if self._model_loaded:
            return
        if not self._model_path.exists():
            logger.info("XGBoost pricing model not found — using fallback algorithm")
            self._use_fallback = True
            self._model_loaded = True
            return
        try:
            import joblib
            self._model = joblib.load(self._model_path)
            logger.info(f"XGBoost pricing model loaded from {self._model_path}")
        except Exception as e:
            logger.error(f"Failed to load pricing model: {e} — using fallback")
            self._use_fallback = True
        self._model_loaded = True

    async def recommend_price(
        self,
        product_info: Dict[str, Any],
        cost_data: Dict[str, Any],
        market_data: Optional[Dict[str, Any]] = None,
        historical_sales: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        """
        Generate price recommendation.
        
        Args:
            product_info: category, craft_type, material, etc.
            cost_data: raw_material_cost, labour_cost, packaging_cost, transport_cost, quantity
            market_data: average_price, min_price, max_price, demand_score
            historical_sales: list of past sale prices
            
        Returns:
            {
                minimum_price, suggested_price, maximum_price,
                expected_profit, profit_margin, market_average_price,
                confidence, explanation, model_used
            }
        """
        self._load_model()

        # Compute total cost
        raw_cost = float(cost_data.get("raw_material_cost", 0))
        labour = float(cost_data.get("labour_cost", 0))
        packaging = float(cost_data.get("packaging_cost", 0))
        transport = float(cost_data.get("transport_cost", 0))
        quantity = max(1, int(cost_data.get("quantity", 1)))
        total_cost = raw_cost + labour + packaging + transport
        unit_cost = total_cost / quantity

        if not self._use_fallback and self._model is not None:
            result = await self._xgboost_price(
                product_info, cost_data, market_data, historical_sales, unit_cost
            )
        else:
            result = self._fallback_price(
                product_info, cost_data, market_data, unit_cost
            )

        # Safety clamp — never below unit cost
        result["minimum_price"] = max(result["minimum_price"], unit_cost * 1.05)
        result["suggested_price"] = max(
            result["suggested_price"], result["minimum_price"]
        )
        result["maximum_price"] = max(
            result["maximum_price"], result["suggested_price"]
        )

        # Round to nearest ₹
        for key in ["minimum_price", "suggested_price", "maximum_price"]:
            result[key] = round(result[key])

        # Profit metrics
        result["expected_profit"] = round(result["suggested_price"] - unit_cost, 2)
        result["profit_margin"] = round(
            (result["expected_profit"] / result["suggested_price"]) * 100
            if result["suggested_price"] > 0 else 0,
            1,
        )
        result["total_cost"] = round(unit_cost, 2)
        result["market_average_price"] = (
            market_data.get("average_price") if market_data else None
        )

        return result

    async def _xgboost_price(
        self,
        product_info: Dict,
        cost_data: Dict,
        market_data: Optional[Dict],
        historical_sales: Optional[List],
        unit_cost: float,
    ) -> Dict[str, Any]:
        """Use trained XGBoost model for pricing."""
        try:
            import numpy as np

            # Build feature vector
            features = self._build_features(product_info, cost_data, market_data, unit_cost)
            
            loop = asyncio.get_event_loop()
            predicted = await loop.run_in_executor(
                None,
                lambda: float(self._model.predict(np.array([features]))[0])
            )

            markup = max(1.5, predicted / unit_cost) if unit_cost > 0 else 2.0
            return {
                "minimum_price": unit_cost * 1.1,
                "suggested_price": predicted,
                "maximum_price": predicted * 1.25,
                "confidence": 0.75,
                "model_used": "xgboost",
                "explanation": "",  # Will be filled by Gemini/fallback
            }
        except Exception as e:
            logger.error(f"XGBoost prediction failed: {e} — using fallback")
            return self._fallback_price(product_info, cost_data, market_data, unit_cost)

    def _build_features(
        self, product_info: Dict, cost_data: Dict, market_data: Optional[Dict], unit_cost: float
    ) -> list:
        """Build ML feature vector from inputs."""
        category = product_info.get("category", "default").lower()
        markup = CATEGORY_MARKUP.get(category, CATEGORY_MARKUP["default"])
        demand = market_data.get("demand_score", 0.5) if market_data else 0.5
        avg_market = market_data.get("average_price", unit_cost * markup) if market_data else unit_cost * markup
        
        return [
            unit_cost,
            markup,
            demand,
            avg_market,
            float(cost_data.get("raw_material_cost", 0)),
            float(cost_data.get("labour_cost", 0)),
            float(cost_data.get("packaging_cost", 0)),
            float(cost_data.get("transport_cost", 0)),
            float(cost_data.get("production_time_hours", 0)),
            float(cost_data.get("quantity", 1)),
        ]

    def _fallback_price(
        self,
        product_info: Dict,
        cost_data: Dict,
        market_data: Optional[Dict],
        unit_cost: float,
    ) -> Dict[str, Any]:
        """
        Deterministic cost-plus pricing with market awareness.
        Formula: suggested = max(cost * markup, market_low) capped at market_high.
        """
        category = (product_info.get("category") or "default").lower()
        craft_type = (product_info.get("craft_type") or "default").lower()

        markup = CATEGORY_MARKUP.get(category, CATEGORY_MARKUP["default"])
        cost_based_price = unit_cost * markup

        # Market adjustment
        market_avg = None
        market_min = None
        market_max = None
        demand_score = 0.5

        if market_data:
            market_avg = market_data.get("average_price")
            market_min = market_data.get("min_price")
            market_max = market_data.get("max_price")
            demand_score = market_data.get("demand_score", 0.5)

        # Blend cost-based and market-based
        if market_avg:
            suggested = (cost_based_price * 0.5) + (market_avg * 0.5)
        else:
            suggested = cost_based_price

        # Demand adjustment: up to +20% for high demand
        demand_bonus = 1.0 + (demand_score - 0.5) * 0.4
        suggested *= demand_bonus

        # Bounds
        minimum = unit_cost * 1.1
        maximum = suggested * 1.3

        if market_min:
            minimum = max(minimum, market_min * 0.85)
        if market_max:
            maximum = min(maximum, market_max * 1.1)

        confidence = 0.6 if market_data else 0.4

        return {
            "minimum_price": minimum,
            "suggested_price": suggested,
            "maximum_price": maximum,
            "confidence": confidence,
            "model_used": "fallback-cost-plus",
            "explanation": "",
        }

    def build_explanation(
        self,
        cost_data: Dict,
        market_data: Optional[Dict],
        result: Dict,
    ) -> str:
        """Build artisan-friendly pricing explanation (without Gemini)."""
        unit_cost = result.get("total_cost", 0)
        suggested = result.get("suggested_price", 0)
        margin = result.get("profit_margin", 0)

        parts = [
            f"Your total production cost per unit is ₹{unit_cost:.0f}."
        ]

        if market_data and market_data.get("average_price"):
            parts.append(
                f"Similar products are selling for ₹{market_data.get('min_price', 0):.0f}–"
                f"₹{market_data.get('max_price', 0):.0f} with an average of "
                f"₹{market_data.get('average_price', 0):.0f}."
            )

        parts.append(
            f"A suggested price of ₹{suggested:.0f} gives you an estimated profit margin "
            f"of {margin:.1f}%."
        )
        parts.append(
            "You can set a higher price for premium quality or handcrafted uniqueness. "
            "These are estimates — actual market response may vary."
        )

        return " ".join(parts)

    async def train_model(self, training_data: List[Dict]) -> bool:
        """
        Train or retrain XGBoost model with new data.
        Returns True on success.
        """
        try:
            import numpy as np
            import xgboost as xgb
            import joblib

            X = []
            y = []
            for record in training_data:
                features = self._build_features(
                    record.get("product_info", {}),
                    record.get("cost_data", {}),
                    record.get("market_data"),
                    record.get("unit_cost", 0),
                )
                X.append(features)
                y.append(record["actual_price"])

            X = np.array(X)
            y = np.array(y)

            model = xgb.XGBRegressor(
                n_estimators=200,
                max_depth=6,
                learning_rate=0.1,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=42,
            )
            
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, lambda: model.fit(X, y))
            
            self._model_path.parent.mkdir(parents=True, exist_ok=True)
            joblib.dump(model, self._model_path)
            self._model = model
            self._use_fallback = False
            
            logger.info(f"Pricing model trained with {len(training_data)} samples")
            return True
        except Exception as e:
            logger.error(f"Model training failed: {e}")
            return False


pricing_service = PricingService()
