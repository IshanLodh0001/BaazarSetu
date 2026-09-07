"""
BaazarSetu — Artisan Model
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, Integer, ForeignKey, DateTime, Enum as SAEnum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.core.database import Base


class VerificationStatus(str, enum.Enum):
    pending = "pending"
    verified = "verified"
    rejected = "rejected"


class Artisan(Base):
    __tablename__ = "artisans"

    artisan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id"), unique=True, nullable=False
    )
    business_name: Mapped[str | None] = mapped_column(String(300))
    craft_type: Mapped[str | None] = mapped_column(String(200))
    experience_years: Mapped[int] = mapped_column(Integer, default=0)
    state: Mapped[str | None] = mapped_column(String(100))
    district: Mapped[str | None] = mapped_column(String(100))
    address: Mapped[str | None] = mapped_column(Text)
    bio: Mapped[str | None] = mapped_column(Text)
    verification_status: Mapped[VerificationStatus] = mapped_column(
        SAEnum(VerificationStatus), default=VerificationStatus.pending
    )
    rating: Mapped[float] = mapped_column(Float, default=0.0)
    total_products: Mapped[int] = mapped_column(Integer, default=0)
    total_orders: Mapped[int] = mapped_column(Integer, default=0)
    production_capacity: Mapped[int | None] = mapped_column(Integer)  # units/month
    onboarding_complete: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="artisan")
    products: Mapped[list["Product"]] = relationship("Product", back_populates="seller")
    orders_received: Mapped[list["Order"]] = relationship("Order", back_populates="seller", foreign_keys="Order.seller_id")
    enquiries_received: Mapped[list["Enquiry"]] = relationship("Enquiry", back_populates="seller", foreign_keys="Enquiry.seller_id")
