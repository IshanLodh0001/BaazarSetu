"""
BaazarSetu — Enquiry Model (B2B bulk request)
"""
import uuid
from datetime import datetime, date, timezone
from sqlalchemy import Float, Integer, ForeignKey, DateTime, Date, String, Enum as SAEnum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.core.database import Base


class EnquiryStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    counter_offer = "counter_offer"
    completed = "completed"
    cancelled = "cancelled"


class Enquiry(Base):
    __tablename__ = "enquiries"

    enquiry_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    buyer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("buyers.buyer_id"), nullable=False, index=True
    )
    seller_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("artisans.artisan_id"), nullable=False, index=True
    )
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.product_id"), nullable=True
    )
    required_quantity: Mapped[int] = mapped_column(Integer, default=1)
    proposed_price: Mapped[float | None] = mapped_column(Float)
    budget: Mapped[float | None] = mapped_column(Float)
    delivery_date: Mapped[date | None] = mapped_column(Date)
    message: Mapped[str | None] = mapped_column(Text)
    counter_offer_price: Mapped[float | None] = mapped_column(Float)
    counter_offer_message: Mapped[str | None] = mapped_column(Text)
    status: Mapped[EnquiryStatus] = mapped_column(
        SAEnum(EnquiryStatus), default=EnquiryStatus.pending, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    buyer: Mapped["Buyer"] = relationship("Buyer", back_populates="enquiries", foreign_keys=[buyer_id])
    seller: Mapped["Artisan"] = relationship("Artisan", back_populates="enquiries_received", foreign_keys=[seller_id])
    product: Mapped["Product"] = relationship("Product", back_populates="enquiries")
