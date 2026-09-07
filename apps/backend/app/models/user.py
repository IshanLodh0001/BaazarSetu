"""
BaazarSetu — User Model
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.core.database import Base


class UserRole(str, enum.Enum):
    artisan = "artisan"
    buyer = "buyer"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    name: Mapped[str | None] = mapped_column(String(200))
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), nullable=False, default=UserRole.artisan)
    preferred_language: Mapped[str] = mapped_column(String(10), default="en")
    profile_image: Mapped[str | None] = mapped_column(String(500))
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    artisan: Mapped["Artisan"] = relationship("Artisan", back_populates="user", uselist=False)
    buyer: Mapped["Buyer"] = relationship("Buyer", back_populates="user", uselist=False)
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="user")
    voice_records: Mapped[list["VoiceRecord"]] = relationship("VoiceRecord", back_populates="user")
