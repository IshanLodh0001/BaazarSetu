"""
BaazarSetu — VoiceRecord Model
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class VoiceRecord(Base):
    __tablename__ = "voice_records"

    voice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False, index=True
    )
    audio_path: Mapped[str] = mapped_column(String(500), nullable=False)
    detected_language: Mapped[str | None] = mapped_column(String(20))
    requested_language: Mapped[str | None] = mapped_column(String(20))
    transcribed_text: Mapped[str | None] = mapped_column(Text)
    translated_text: Mapped[str | None] = mapped_column(Text)
    confidence: Mapped[float | None] = mapped_column(Float)
    duration_seconds: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User"] = relationship("User", back_populates="voice_records")
