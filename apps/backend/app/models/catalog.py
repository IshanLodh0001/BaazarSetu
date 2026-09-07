"""
BaazarSetu — Catalog Model (AI-generated product catalog)
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Catalog(Base):
    __tablename__ = "catalogs"

    catalog_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.product_id"), unique=True, nullable=False
    )
    generated_title: Mapped[str | None] = mapped_column(String(500))
    generated_description: Mapped[str | None] = mapped_column(Text)
    generated_category: Mapped[str | None] = mapped_column(String(200))
    generated_subcategory: Mapped[str | None] = mapped_column(String(200))
    generated_craft_type: Mapped[str | None] = mapped_column(String(200))
    generated_material: Mapped[str | None] = mapped_column(String(300))
    generated_colour: Mapped[str | None] = mapped_column(String(200))
    generated_tags: Mapped[list | None] = mapped_column(JSON, default=list)
    seo_keywords: Mapped[list | None] = mapped_column(JSON, default=list)
    source_language: Mapped[str | None] = mapped_column(String(20))
    gemini_model_used: Mapped[str | None] = mapped_column(String(100))
    generation_prompt: Mapped[str | None] = mapped_column(Text)
    raw_ai_response: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    product: Mapped["Product"] = relationship("Product", back_populates="catalog")
