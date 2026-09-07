"""
BaazarSetu — Buyer Model
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, DateTime, Enum as SAEnum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.core.database import Base


class BuyerType(str, enum.Enum):
    individual = "individual"
    retailer = "retailer"
    wholesaler = "wholesaler"
    exporter = "exporter"
    ngo = "ngo"


class Buyer(Base):
    __tablename__ = "buyers"

    buyer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id"), unique=True, nullable=False
    )
    buyer_type: Mapped[BuyerType] = mapped_column(
        SAEnum(BuyerType), default=BuyerType.individual
    )
    company_name: Mapped[str | None] = mapped_column(String(300))
    business_description: Mapped[str | None] = mapped_column(Text)
    state: Mapped[str | None] = mapped_column(String(100))
    district: Mapped[str | None] = mapped_column(String(100))
    profile_image: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="buyer")
    cart: Mapped["Cart"] = relationship("Cart", back_populates="buyer", uselist=False)
    orders: Mapped[list["Order"]] = relationship("Order", back_populates="buyer", foreign_keys="Order.buyer_id")
    enquiries: Mapped[list["Enquiry"]] = relationship("Enquiry", back_populates="buyer", foreign_keys="Enquiry.buyer_id")
    reviews: Mapped[list["Review"]] = relationship("Review", back_populates="buyer")
