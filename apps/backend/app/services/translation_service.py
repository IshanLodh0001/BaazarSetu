"""
BaazarSetu — Translation Service
Primary: IndicTrans2 (AI4Bharat) for Indic language translation.
Fallback: Gemini (if explicitly configured).

TranslationService abstraction — the route layer never calls the model directly.
"""
import asyncio
from typing import Optional, Dict, Any

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Supported IndicTrans2 language codes
INDIC_LANGUAGES = {
    "asm_Beng": "Assamese",
    "ben_Beng": "Bengali",
    "brx_Deva": "Bodo",
    "doi_Deva": "Dogri",
    "gom_Deva": "Konkani",
    "guj_Gujr": "Gujarati",
    "hin_Deva": "Hindi",
    "hne_Deva": "Chhattisgarhi",
    "kan_Knda": "Kannada",
    "kas_Arab": "Kashmiri (Arabic)",
    "kas_Deva": "Kashmiri (Devanagari)",
    "kha_Latn": "Khasi",
    "lus_Latn": "Mizo",
    "mag_Deva": "Magahi",
    "mai_Deva": "Maithili",
    "mal_Mlym": "Malayalam",
    "mar_Deva": "Marathi",
    "mni_Beng": "Manipuri (Bengali)",
    "mni_Mtei": "Manipuri (Meitei)",
    "npi_Deva": "Nepali",
    "ory_Orya": "Odia",
    "pan_Guru": "Punjabi",
    "san_Deva": "Sanskrit",
    "sat_Olck": "Santali",
    "snd_Arab": "Sindhi (Arabic)",
    "snd_Deva": "Sindhi (Devanagari)",
    "tam_Taml": "Tamil",
    "tel_Telu": "Telugu",
    "urd_Arab": "Urdu",
    "eng_Latn": "English",
}

# Convenience short-code mapping
SHORT_TO_INDICTRANS = {
    "as": "asm_Beng", "bn": "ben_Beng", "gu": "guj_Gujr", "hi": "hin_Deva",
    "kn": "kan_Knda", "ml": "mal_Mlym", "mr": "mar_Deva", "or": "ory_Orya",
    "pa": "pan_Guru", "ta": "tam_Taml", "te": "tel_Telu", "ur": "urd_Arab",
    "en": "eng_Latn", "mai": "mai_Deva", "mni": "mni_Beng",
}


class TranslationError(Exception):
    pass


class TranslationService:
    """
    Abstraction for translation.
    Primary: IndicTrans2 (local HuggingFace model).
    Fallback: Gemini (if INDICTRANS_ENABLED=false or model unavailable).
    """

    def __init__(self) -> None:
        self._indictrans_model = None
        self._indictrans_tokenizer = None
        self._enabled = settings.INDICTRANS_ENABLED
        if self._enabled:
            logger.info("IndicTrans2 enabled — will load lazily on first use")
        else:
            logger.warning(
                "IndicTrans2 disabled (INDICTRANS_ENABLED=false). "
                "Translation will use Gemini fallback."
            )

    def _normalize_lang(self, code: str) -> str:
        """Convert short code (hi, bn) to IndicTrans2 code."""
        if code in INDIC_LANGUAGES:
            return code
        return SHORT_TO_INDICTRANS.get(code, code)

    def _load_indictrans(self):
        """Lazily load IndicTrans2 model and tokenizer."""
        if self._indictrans_model is not None:
            return
        try:
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
            model_path = settings.INDICTRANS_MODEL_PATH
            logger.info(f"Loading IndicTrans2 from {model_path}...")
            self._indictrans_tokenizer = AutoTokenizer.from_pretrained(
                model_path, trust_remote_code=True
            )
            self._indictrans_model = AutoModelForSeq2SeqLM.from_pretrained(
                model_path, trust_remote_code=True
            ).to(settings.INDICTRANS_DEVICE)
            logger.info("IndicTrans2 model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load IndicTrans2: {e}")
            raise TranslationError(f"IndicTrans2 model load failed: {e}")

    def _translate_indictrans_sync(
        self, text: str, source_lang: str, target_lang: str
    ) -> str:
        """Blocking IndicTrans2 translation — run in executor."""
        self._load_indictrans()
        import torch

        src = self._normalize_lang(source_lang)
        tgt = self._normalize_lang(target_lang)

        inputs = self._indictrans_tokenizer(
            text,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=512,
            src_lang=src,
        ).to(settings.INDICTRANS_DEVICE)

        with torch.no_grad():
            outputs = self._indictrans_model.generate(
                **inputs,
                forced_bos_token_id=self._indictrans_tokenizer.lang_code_to_id[tgt],
                max_new_tokens=512,
                num_beams=4,
                early_stopping=True,
            )
        translated = self._indictrans_tokenizer.batch_decode(
            outputs, skip_special_tokens=True
        )
        return translated[0] if translated else text

    async def translate(
        self,
        text: str,
        source_language: str,
        target_language: str,
    ) -> Dict[str, Any]:
        """
        Translate text from source to target language.
        
        Returns:
            {
                "original_text": str,
                "translated_text": str,
                "source_language": str,
                "target_language": str,
                "model_used": str,
                "success": bool,
                "error": Optional[str]
            }
        """
        if source_language == target_language:
            return {
                "original_text": text,
                "translated_text": text,
                "source_language": source_language,
                "target_language": target_language,
                "model_used": "identity",
                "success": True,
                "error": None,
            }

        if self._enabled:
            try:
                loop = asyncio.get_event_loop()
                translated = await loop.run_in_executor(
                    None,
                    lambda: self._translate_indictrans_sync(text, source_language, target_language)
                )
                return {
                    "original_text": text,
                    "translated_text": translated,
                    "source_language": source_language,
                    "target_language": target_language,
                    "model_used": "indictrans2",
                    "success": True,
                    "error": None,
                }
            except Exception as e:
                logger.error(f"IndicTrans2 failed, trying Gemini fallback: {e}")
                return await self._translate_gemini_fallback(text, source_language, target_language)
        else:
            return await self._translate_gemini_fallback(text, source_language, target_language)

    async def _translate_gemini_fallback(
        self, text: str, source_language: str, target_language: str
    ) -> Dict[str, Any]:
        """Use Gemini for translation as a fallback."""
        try:
            from app.services.gemini_service import gemini_service
            if not gemini_service.enabled:
                raise TranslationError("Gemini not configured")

            lang_names = {
                "hi": "Hindi", "en": "English", "bn": "Bengali", "gu": "Gujarati",
                "ta": "Tamil", "te": "Telugu", "mr": "Marathi", "kn": "Kannada",
                "ml": "Malayalam", "pa": "Punjabi", "or": "Odia",
            }
            src_name = lang_names.get(source_language, source_language)
            tgt_name = lang_names.get(target_language, target_language)

            prompt = (
                f"Translate the following text from {src_name} to {tgt_name}. "
                f"Output ONLY the translated text, nothing else.\n\nText: {text}"
            )
            translated = await gemini_service._call_with_retry(prompt)
            return {
                "original_text": text,
                "translated_text": translated.strip(),
                "source_language": source_language,
                "target_language": target_language,
                "model_used": "gemini-fallback",
                "success": True,
                "error": None,
            }
        except Exception as e:
            logger.error(f"All translation methods failed: {e}")
            return {
                "original_text": text,
                "translated_text": text,  # Return original on total failure
                "source_language": source_language,
                "target_language": target_language,
                "model_used": "none",
                "success": False,
                "error": "Translation unavailable — original text returned",
            }

    @property
    def supported_languages(self) -> Dict[str, str]:
        return INDIC_LANGUAGES


translation_service = TranslationService()
