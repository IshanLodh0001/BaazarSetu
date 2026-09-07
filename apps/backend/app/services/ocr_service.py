"""
BaazarSetu — OCR Service (PaddleOCR)
Extract text from product images, labels, certificates.
"""
import asyncio
import io
from typing import Optional, Dict, Any, List

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class OCRService:
    """
    PaddleOCR-based text extraction from product images.
    Used for reading labels, packaging text, certification text.
    """

    def __init__(self) -> None:
        self._ocr = None
        self._enabled = settings.PADDLEOCR_ENABLED
        logger.info(f"OCRService: {'enabled' if self._enabled else 'disabled'}")

    def _get_ocr(self):
        if self._ocr is not None:
            return self._ocr
        if not self._enabled:
            return None
        try:
            from paddleocr import PaddleOCR
            self._ocr = PaddleOCR(
                use_angle_cls=True,
                lang=settings.PADDLEOCR_LANG,
                show_log=False,
            )
            logger.info("PaddleOCR initialized")
            return self._ocr
        except ImportError:
            raise RuntimeError("PaddleOCR not installed. Run: pip install paddleocr")
        except Exception as e:
            logger.error(f"PaddleOCR init failed: {e}")
            raise

    async def extract_text(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Extract text from image.
        Returns {text_blocks: [...], full_text: str, confidence: float}
        """
        if not self._enabled:
            return {"text_blocks": [], "full_text": "", "confidence": 0.0, "enabled": False}

        loop = asyncio.get_event_loop()
        try:
            result = await loop.run_in_executor(
                None, lambda: self._extract_sync(image_bytes)
            )
            return result
        except Exception as e:
            logger.warning(f"OCR extraction failed: {e}")
            return {
                "text_blocks": [],
                "full_text": "",
                "confidence": 0.0,
                "error": str(e),
            }

    def _extract_sync(self, image_bytes: bytes) -> Dict[str, Any]:
        import numpy as np
        import cv2

        ocr = self._get_ocr()
        if ocr is None:
            return {"text_blocks": [], "full_text": "", "confidence": 0.0}

        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        result = ocr.ocr(img, cls=True)

        text_blocks = []
        confidences = []

        if result and result[0]:
            for line in result[0]:
                box, (text, conf) = line
                text_blocks.append({"text": text, "confidence": round(conf, 3), "box": box})
                confidences.append(conf)

        full_text = " ".join(b["text"] for b in text_blocks)
        avg_conf = sum(confidences) / len(confidences) if confidences else 0.0

        return {
            "text_blocks": text_blocks,
            "full_text": full_text,
            "confidence": round(avg_conf, 3),
        }


ocr_service = OCRService()
