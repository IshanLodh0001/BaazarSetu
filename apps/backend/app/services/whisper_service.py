"""
BaazarSetu — Whisper Service
Local speech-to-text using OpenAI Whisper.
Supports regional Indian languages.
"""
import asyncio
import time
import tempfile
import os
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Whisper language codes for Indian languages
SUPPORTED_LANGUAGES = {
    "hi": "Hindi",
    "bn": "Bengali",
    "te": "Telugu",
    "mr": "Marathi",
    "ta": "Tamil",
    "gu": "Gujarati",
    "kn": "Kannada",
    "ml": "Malayalam",
    "pa": "Punjabi",
    "or": "Odia",
    "as": "Assamese",
    "ur": "Urdu",
    "en": "English",
}


class WhisperError(Exception):
    pass


class WhisperService:
    """
    Local Whisper transcription service.
    Model is lazily loaded on first use to avoid blocking startup.
    """

    def __init__(self) -> None:
        self._model = None
        self._model_name = settings.WHISPER_MODEL
        self._device = settings.WHISPER_DEVICE
        self._loading = False
        logger.info(f"WhisperService configured: model={self._model_name} device={self._device}")

    def _load_model(self):
        """Load Whisper model (blocking — runs in executor)."""
        if self._model is not None:
            return self._model
        try:
            import whisper
            logger.info(f"Loading Whisper model '{self._model_name}'...")
            start = time.time()
            self._model = whisper.load_model(self._model_name, device=self._device)
            elapsed = time.time() - start
            logger.info(f"Whisper model loaded in {elapsed:.1f}s")
            return self._model
        except ImportError:
            raise WhisperError(
                "Whisper is not installed. Run: pip install openai-whisper"
            )
        except Exception as e:
            raise WhisperError(f"Failed to load Whisper model: {e}")

    async def transcribe(
        self,
        audio_path: str,
        language: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Transcribe audio file using Whisper.
        
        Args:
            audio_path: Absolute path to audio file
            language: ISO-639-1 language code (optional; auto-detects if None)
            
        Returns:
            {
                "language": str,
                "transcript": str,
                "confidence": float,
                "duration_seconds": float,
                "segments": list
            }
        """
        if not Path(audio_path).exists():
            raise WhisperError(f"Audio file not found: {audio_path}")

        try:
            loop = asyncio.get_event_loop()
            result = await asyncio.wait_for(
                loop.run_in_executor(
                    None,
                    lambda: self._transcribe_sync(audio_path, language)
                ),
                timeout=settings.WHISPER_TIMEOUT_SECONDS,
            )
            logger.info(
                "Whisper transcription complete",
                extra={
                    "detected_language": result.get("language"),
                    "transcript_length": len(result.get("transcript", "")),
                }
            )
            return result
        except asyncio.TimeoutError:
            raise WhisperError(
                f"Whisper transcription timed out after {settings.WHISPER_TIMEOUT_SECONDS}s"
            )
        except WhisperError:
            raise
        except Exception as e:
            logger.error(f"Whisper transcription failed: {e}")
            raise WhisperError(f"Transcription failed: {str(e)}")

    def _transcribe_sync(
        self, audio_path: str, language: Optional[str] = None
    ) -> Dict[str, Any]:
        """Blocking transcription call — run in executor."""
        model = self._load_model()
        
        options: Dict[str, Any] = {
            "task": "transcribe",
            "fp16": False,  # CPU-safe
            "verbose": False,
        }
        if language and language in SUPPORTED_LANGUAGES:
            options["language"] = language

        result = model.transcribe(audio_path, **options)

        # Compute average segment confidence if available
        segments = result.get("segments", [])
        confidence = 0.0
        if segments:
            avg_prob = sum(s.get("avg_logprob", -1) for s in segments) / len(segments)
            # Convert log-prob to rough confidence (heuristic)
            confidence = max(0.0, min(1.0, 1.0 + avg_prob / 5.0))

        return {
            "language": result.get("language", "unknown"),
            "transcript": result.get("text", "").strip(),
            "confidence": round(confidence, 3),
            "duration_seconds": segments[-1]["end"] if segments else 0.0,
            "segments": [
                {
                    "start": s["start"],
                    "end": s["end"],
                    "text": s["text"],
                }
                for s in segments[:20]  # Limit segment list
            ],
        }

    def is_language_supported(self, lang_code: str) -> bool:
        return lang_code in SUPPORTED_LANGUAGES

    @property
    def supported_languages(self) -> Dict[str, str]:
        return SUPPORTED_LANGUAGES


whisper_service = WhisperService()
