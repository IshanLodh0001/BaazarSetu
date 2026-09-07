"""
BaazarSetu — MarketData Model (seeded historical price data)
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, Integer, DateTime, Date
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class MarketData(Base):
    __tablename__ = "market_data"

    market_data_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    category: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    subcategory: Mapped[str | None] = mapped_column(String(200))
    craft_type: Mapped[str | None] = mapped_column(String(200), index=True)
    material: Mapped[str | None] = mapped_column(String(300))
    state: Mapped[str | None] = mapped_column(String(100))

    # Price data
    average_price: Mapped[float] = mapped_column(Float, default=0.0)
    min_price: Mapped[float] = mapped_column(Float, default=0.0)
    max_price: Mapped[float] = mapped_column(Float, default=0.0)
    demand_score: Mapped[float] = mapped_column(Float, default=0.5)  # 0.0–1.0
    competition_level: Mapped[str | None] = mapped_column(String(50))  # low|medium|high

    # Sample size
    sample_count: Mapped[int] = mapped_column(Integer, default=0)
    data_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
