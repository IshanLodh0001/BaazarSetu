"""
BaazarSetu — Product Model
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    String, Float, Integer, ForeignKey, DateTime,
    Enum as SAEnum, Text, Boolean, ARRAY, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.core.database import Base


class ProductStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    out_of_stock = "out_of_stock"
    archived = "archived"


class Product(Base):
    __tablename__ = "products"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    seller_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("artisans.artisan_id"), nullable=False, index=True
    )

    # Core product info
    product_name: Mapped[str] = mapped_column(String(500), nullable=False)
    category: Mapped[str | None] = mapped_column(String(200), index=True)
    subcategory: Mapped[str | None] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    material: Mapped[str | None] = mapped_column(String(300))
    colour: Mapped[str | None] = mapped_column(String(200))
    craft_type: Mapped[str | None] = mapped_column(String(200), index=True)
    style: Mapped[str | None] = mapped_column(String(200))
    estimated_size: Mapped[str | None] = mapped_column(String(200))
    tags: Mapped[list | None] = mapped_column(JSON, default=list)
    seo_keywords: Mapped[list | None] = mapped_column(JSON, default=list)
    visual_features: Mapped[list | None] = mapped_column(JSON, default=list)

    # Pricing
    price: Mapped[float] = mapped_column(Float, default=0.0)
    ai_suggested_price: Mapped[float | None] = mapped_column(Float)
    market_min_price: Mapped[float | None] = mapped_column(Float)
    market_max_price: Mapped[float | None] = mapped_column(Float)

    # Images
    original_image: Mapped[str | None] = mapped_column(String(500))
    enhanced_image: Mapped[str | None] = mapped_column(String(500))
    thumbnail: Mapped[str | None] = mapped_column(String(500))

    # Ratings
    rating: Mapped[float] = mapped_column(Float, default=0.0)
    review_count: Mapped[int] = mapped_column(Integer, default=0)

    # AI recognition confidence
    ai_confidence: Mapped[float | None] = mapped_column(Float)

    # Status
    status: Mapped[ProductStatus] = mapped_column(
        SAEnum(ProductStatus), default=ProductStatus.draft, index=True
    )
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    seller: Mapped["Artisan"] = relationship("Artisan", back_populates="products")
    images: Mapped[list["ProductImage"]] = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    catalog: Mapped["Catalog"] = relationship("Catalog", back_populates="product", uselist=False)
    pricing_records: Mapped[list["PricingRecord"]] = relationship("PricingRecord", back_populates="product")
    inventory: Mapped["Inventory"] = relationship("Inventory", back_populates="product", uselist=False)
    reviews: Mapped[list["Review"]] = relationship("Review", back_populates="product")
    order_items: Mapped[list["OrderItem"]] = relationship("OrderItem", back_populates="product")
    cart_items: Mapped[list["CartItem"]] = relationship("CartItem", back_populates="product")
    enquiries: Mapped[list["Enquiry"]] = relationship("Enquiry", back_populates="product")
