"""
BaazarSetu — PricingRecord Model (XGBoost / fallback pricing engine output)
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, Integer, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class PricingRecord(Base):
    __tablename__ = "pricing_records"

    pricing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.product_id"), nullable=False, index=True
    )

    # Input costs
    raw_material_cost: Mapped[float] = mapped_column(Float, default=0.0)
    labour_cost: Mapped[float] = mapped_column(Float, default=0.0)
    packaging_cost: Mapped[float] = mapped_column(Float, default=0.0)
    transport_cost: Mapped[float] = mapped_column(Float, default=0.0)
    production_time_hours: Mapped[float] = mapped_column(Float, default=0.0)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    location: Mapped[str | None] = mapped_column(String(200))

    # Computed costs
    total_cost: Mapped[float] = mapped_column(Float, default=0.0)

    # Market data snapshot
    market_average_price: Mapped[float | None] = mapped_column(Float)
    market_min_price: Mapped[float | None] = mapped_column(Float)
    market_max_price: Mapped[float | None] = mapped_column(Float)

    # Recommendations
    minimum_price: Mapped[float] = mapped_column(Float, default=0.0)
    suggested_price: Mapped[float] = mapped_column(Float, default=0.0)
    maximum_price: Mapped[float] = mapped_column(Float, default=0.0)
    expected_profit: Mapped[float] = mapped_column(Float, default=0.0)
    profit_margin: Mapped[float] = mapped_column(Float, default=0.0)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    pricing_reason: Mapped[str | None] = mapped_column(Text)

    # Metadata
    model_used: Mapped[str | None] = mapped_column(String(100))  # "xgboost" | "fallback"
    is_applied: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    product: Mapped["Product"] = relationship("Product", back_populates="pricing_records")
