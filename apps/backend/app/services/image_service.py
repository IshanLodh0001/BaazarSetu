"""
BaazarSetu — Image Processing Service
Uses rembg for background removal, Pillow for enhancement.
"""
import asyncio
import io
import uuid
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import PIL.Image

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Marketplace image dimensions (max width, max height)
MARKETPLACE_MAX_SIZE = (1200, 1200)
THUMBNAIL_SIZE = (300, 300)


class ImageProcessingError(Exception):
    pass


class ImageProcessingService:
    """
    Image processing pipeline for product photos.
    rembg: background removal
    Pillow: enhancement, cropping, resizing
    """

    def __init__(self) -> None:
        self._rembg_session = None
        self._rembg_enabled = settings.REMBG_ENABLED
        logger.info(
            f"ImageProcessingService init: rembg={'enabled' if self._rembg_enabled else 'disabled'}"
        )

    def _get_rembg_session(self):
        """Lazily load rembg session."""
        if self._rembg_session is not None:
            return self._rembg_session
        if not self._rembg_enabled:
            return None
        try:
            from rembg import new_session
            logger.info(f"Loading rembg model '{settings.REMBG_MODEL}'...")
            self._rembg_session = new_session(settings.REMBG_MODEL)
            logger.info("rembg session ready")
            return self._rembg_session
        except ImportError:
            raise ImageProcessingError("rembg not installed. Run: pip install rembg")
        except Exception as e:
            logger.error(f"rembg session load failed: {e}")
            raise ImageProcessingError(f"rembg model load failed: {e}")

    # ── Background Removal ────────────────────────────────────────────────────

    async def remove_background(
        self, image_bytes: bytes, add_white_bg: bool = True
    ) -> bytes:
        """
        Remove background from image using rembg.
        Returns processed image bytes (PNG).
        """
        if not self._rembg_enabled:
            raise ImageProcessingError("Background removal is disabled (REMBG_ENABLED=false)")

        loop = asyncio.get_event_loop()
        try:
            result = await loop.run_in_executor(
                None,
                lambda: self._remove_bg_sync(image_bytes, add_white_bg)
            )
            logger.info("Background removal successful")
            return result
        except ImageProcessingError:
            raise
        except Exception as e:
            logger.error(f"Background removal failed: {e}")
            raise ImageProcessingError(f"Background removal failed: {e}")

    def _remove_bg_sync(self, image_bytes: bytes, add_white_bg: bool) -> bytes:
        from rembg import remove
        session = self._get_rembg_session()
        
        # Remove background
        output_bytes = remove(image_bytes, session=session)
        img = Image.open(io.BytesIO(output_bytes)).convert("RGBA")

        if add_white_bg:
            # Composite onto white background
            background = Image.new("RGBA", img.size, (255, 255, 255, 255))
            background.paste(img, mask=img.split()[3])
            img = background.convert("RGB")

        buffer = io.BytesIO()
        img.save(buffer, format="PNG", optimize=True)
        return buffer.getvalue()

    # ── Image Enhancement ─────────────────────────────────────────────────────

    async def enhance_image(self, image_bytes: bytes) -> bytes:
        """Apply brightness, contrast, and sharpness improvements."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, lambda: self._enhance_sync(image_bytes)
        )

    def _enhance_sync(self, image_bytes: bytes) -> bytes:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # Auto-levels
        img = ImageOps.autocontrast(img, cutoff=1)
        
        # Brightness
        img = ImageEnhance.Brightness(img).enhance(1.05)
        
        # Contrast
        img = ImageEnhance.Contrast(img).enhance(1.1)
        
        # Sharpness
        img = ImageEnhance.Sharpness(img).enhance(1.2)
        
        # Slight color enhancement
        img = ImageEnhance.Color(img).enhance(1.05)

        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=90, optimize=True)
        return buffer.getvalue()

    # ── Crop Product ──────────────────────────────────────────────────────────

    async def crop_product(self, image_bytes: bytes, padding: float = 0.05) -> bytes:
        """Crop to product bounding box with padding."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, lambda: self._crop_sync(image_bytes, padding)
        )

    def _crop_sync(self, image_bytes: bytes, padding: float) -> bytes:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
        
        # Get bounding box of non-transparent content
        bbox = img.getbbox()
        if bbox is None:
            # No crop if can't detect bbox
            buffer = io.BytesIO()
            img.convert("RGB").save(buffer, format="JPEG", quality=90)
            return buffer.getvalue()

        w, h = img.size
        x1, y1, x2, y2 = bbox
        
        # Add padding
        pad_x = int((x2 - x1) * padding)
        pad_y = int((y2 - y1) * padding)
        x1 = max(0, x1 - pad_x)
        y1 = max(0, y1 - pad_y)
        x2 = min(w, x2 + pad_x)
        y2 = min(h, y2 + pad_y)

        img = img.crop((x1, y1, x2, y2)).convert("RGB")
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=90, optimize=True)
        return buffer.getvalue()

    # ── Resize for Marketplace ────────────────────────────────────────────────

    async def resize_for_marketplace(
        self, image_bytes: bytes, max_size: Tuple[int, int] = MARKETPLACE_MAX_SIZE
    ) -> bytes:
        """Resize image to marketplace standards maintaining aspect ratio."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, lambda: self._resize_sync(image_bytes, max_size)
        )

    def _resize_sync(self, image_bytes: bytes, max_size: Tuple[int, int]) -> bytes:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img.thumbnail(max_size, Image.LANCZOS)
        
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=85, optimize=True)
        return buffer.getvalue()

    # ── Thumbnail ─────────────────────────────────────────────────────────────

    async def generate_thumbnail(self, image_bytes: bytes) -> bytes:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, lambda: self._thumbnail_sync(image_bytes)
        )

    def _thumbnail_sync(self, image_bytes: bytes) -> bytes:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img.thumbnail(THUMBNAIL_SIZE, Image.LANCZOS)
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=80, optimize=True)
        return buffer.getvalue()

    # ── Full Pipeline ─────────────────────────────────────────────────────────

    async def process_product_image(
        self,
        original_bytes: bytes,
        remove_bg: bool = True,
        enhance: bool = True,
        resize: bool = True,
    ) -> Dict[str, Any]:
        """
        Run full product image processing pipeline.
        Returns dict with processed bytes and metadata.
        Original is never modified.
        """
        result: Dict[str, Any] = {
            "background_removed": False,
            "lighting_improved": False,
            "crop_applied": False,
            "resize_applied": False,
        }

        current = original_bytes

        try:
            if remove_bg and self._rembg_enabled:
                current = await self.remove_background(current, add_white_bg=True)
                result["background_removed"] = True
                # Crop after background removal
                current = await self.crop_product(current)
                result["crop_applied"] = True
        except Exception as e:
            logger.warning(f"Background removal step failed: {e} — continuing without it")

        try:
            if enhance:
                current = await self.enhance_image(current)
                result["lighting_improved"] = True
        except Exception as e:
            logger.warning(f"Enhancement step failed: {e}")

        try:
            if resize:
                current = await self.resize_for_marketplace(current)
                result["resize_applied"] = True
        except Exception as e:
            logger.warning(f"Resize step failed: {e}")

        result["processed_bytes"] = current
        
        # Thumbnail (always attempt)
        try:
            result["thumbnail_bytes"] = await self.generate_thumbnail(current)
        except Exception as e:
            logger.warning(f"Thumbnail generation failed: {e}")
            result["thumbnail_bytes"] = None

        return result


image_processing_service = ImageProcessingService()
