"""
BaazarSetu — Storage Service
Abstraction layer for local, S3, GCS, Cloudinary.
Currently implements local storage.
"""
import uuid
import os
import mimetypes
from pathlib import Path
from typing import Optional
import aiofiles

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Allowed image MIME types
ALLOWED_IMAGE_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"
}
ALLOWED_AUDIO_TYPES = {
    "audio/mpeg", "audio/wav", "audio/ogg", "audio/m4a",
    "audio/webm", "audio/flac", "audio/mp4"
}
ALLOWED_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic",
    ".mp3", ".wav", ".ogg", ".m4a", ".webm", ".flac", ".mp4"
}
MAX_SIZE_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


class StorageError(Exception):
    pass


class StorageService:
    """
    Abstract storage interface.
    Replace or extend with S3StorageService / GCSStorageService later.
    """

    def __init__(self) -> None:
        self.base_dir = Path(settings.UPLOAD_DIR)
        self._ensure_dirs()

    def _ensure_dirs(self) -> None:
        for sub in ["originals", "processed", "audio", "profiles"]:
            (self.base_dir / sub).mkdir(parents=True, exist_ok=True)

    def _safe_filename(self, original_name: str, prefix: str = "") -> str:
        """Generate a UUID-based safe filename preserving extension."""
        ext = Path(original_name).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise StorageError(f"File extension '{ext}' is not allowed")
        unique_name = f"{prefix}{uuid.uuid4().hex}{ext}"
        return unique_name

    def validate_image(self, content: bytes, filename: str) -> None:
        """Validate image MIME type and size."""
        if len(content) > MAX_SIZE_BYTES:
            raise StorageError(
                f"File too large. Max allowed: {settings.MAX_UPLOAD_SIZE_MB}MB"
            )
        mime, _ = mimetypes.guess_type(filename)
        if mime not in ALLOWED_IMAGE_TYPES:
            raise StorageError(f"File type '{mime}' not allowed for images")
        ext = Path(filename).suffix.lower()
        if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic"}:
            raise StorageError(f"Extension '{ext}' not allowed for images")

    def validate_audio(self, content: bytes, filename: str) -> None:
        """Validate audio MIME type and size."""
        if len(content) > MAX_SIZE_BYTES:
            raise StorageError(
                f"File too large. Max allowed: {settings.MAX_UPLOAD_SIZE_MB}MB"
            )
        ext = Path(filename).suffix.lower()
        if ext not in {".mp3", ".wav", ".ogg", ".m4a", ".webm", ".flac", ".mp4"}:
            raise StorageError(f"Extension '{ext}' not allowed for audio")

    async def save_image(self, content: bytes, filename: str, sub: str = "originals") -> str:
        """Save image bytes and return relative path."""
        self.validate_image(content, filename)
        safe_name = self._safe_filename(filename)
        dest = self.base_dir / sub / safe_name
        async with aiofiles.open(dest, "wb") as f:
            await f.write(content)
        rel_path = f"{settings.UPLOAD_DIR}/{sub}/{safe_name}"
        logger.info("Saved image", extra={"path": rel_path, "size": len(content)})
        return rel_path

    async def save_audio(self, content: bytes, filename: str) -> str:
        """Save audio bytes and return relative path."""
        self.validate_audio(content, filename)
        safe_name = self._safe_filename(filename, prefix="audio_")
        dest = self.base_dir / "audio" / safe_name
        async with aiofiles.open(dest, "wb") as f:
            await f.write(content)
        rel_path = f"{settings.UPLOAD_DIR}/audio/{safe_name}"
        logger.info("Saved audio", extra={"path": rel_path})
        return rel_path

    def get_absolute_path(self, relative_path: str) -> Path:
        """Resolve a relative stored path to absolute path. Prevents traversal."""
        base = Path(settings.UPLOAD_DIR).resolve()
        full = (base / Path(relative_path).name).resolve()
        # Security: ensure resolved path is inside upload dir
        if not str(full).startswith(str(base)):
            raise StorageError("Path traversal detected")
        return full

    def public_url(self, relative_path: str) -> str:
        """Return a URL the frontend can use to fetch this file."""
        # For local storage, return a path served by FastAPI StaticFiles
        return f"/static/{relative_path}"

    async def delete_file(self, relative_path: str) -> None:
        """Delete a stored file."""
        try:
            abs_path = self.get_absolute_path(relative_path)
            if abs_path.exists():
                abs_path.unlink()
        except Exception as e:
            logger.warning(f"Failed to delete file: {e}")


storage_service = StorageService()
