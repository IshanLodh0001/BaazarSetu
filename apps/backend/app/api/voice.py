"""
BaazarSetu — Voice API
POST /api/v1/voice/transcribe
"""
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.models.voice import VoiceRecord
from app.utils.dependencies import get_current_user
from app.utils.response import success_response, error_response
from app.services.storage_service import storage_service, StorageError
from app.services.whisper_service import whisper_service, WhisperError, SUPPORTED_LANGUAGES
from app.services.translation_service import translation_service
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/voice", tags=["Voice"])


@router.post("/transcribe", response_model=dict, status_code=200)
async def transcribe_audio(
    audio: UploadFile = File(..., description="Audio file (wav, mp3, ogg, m4a, webm)"),
    language: Optional[str] = Form(None, description="Source language code (e.g. hi, bn, ta)"),
    translate_to: Optional[str] = Form(None, description="Target language for translation (e.g. en, hi)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Transcribe audio using local Whisper model.
    
    Optionally translate transcript to a target language using IndicTrans2.
    
    Returns:
    - detected_language
    - transcript (in original language)
    - translated_text (if translate_to is specified)
    - confidence
    - duration_seconds
    """
    audio_bytes = await audio.read()
    
    # Save audio
    try:
        audio_path = await storage_service.save_audio(audio_bytes, audio.filename or "voice.wav")
    except StorageError as e:
        raise HTTPException(status_code=400, detail=error_response("STORAGE_ERROR", str(e)))

    # Build absolute path
    full_path = str(storage_service.base_dir / "audio" / os.path.basename(audio_path))

    # Transcribe
    try:
        transcription = await whisper_service.transcribe(full_path, language)
    except WhisperError as e:
        raise HTTPException(
            status_code=503,
            detail=error_response("TRANSCRIPTION_FAILED", str(e)),
        )

    detected_lang = transcription.get("language", "unknown")
    transcript_text = transcription.get("transcript", "")

    # Optional translation
    translated_text = None
    translation_model = None
    if translate_to and translate_to != detected_lang and transcript_text:
        trans_result = await translation_service.translate(
            transcript_text, detected_lang, translate_to
        )
        if trans_result.get("success"):
            translated_text = trans_result.get("translated_text")
            translation_model = trans_result.get("model_used")

    # Persist voice record
    voice_record = VoiceRecord(
        user_id=current_user.user_id,
        audio_path=audio_path,
        detected_language=detected_lang,
        requested_language=language,
        transcribed_text=transcript_text,
        translated_text=translated_text,
        confidence=transcription.get("confidence"),
        duration_seconds=transcription.get("duration_seconds"),
    )
    db.add(voice_record)
    await db.commit()
    await db.refresh(voice_record)

    logger.info(
        "Voice transcription saved",
        extra={"voice_id": str(voice_record.voice_id), "lang": detected_lang}
    )

    return success_response(
        data={
            "voice_id": str(voice_record.voice_id),
            "detected_language": detected_lang,
            "transcript": transcript_text,
            "translated_text": translated_text,
            "translation_model": translation_model,
            "confidence": transcription.get("confidence"),
            "duration_seconds": transcription.get("duration_seconds"),
        },
        message="Transcription complete",
    )


@router.get("/languages", response_model=dict, status_code=200)
async def get_supported_languages():
    """Get list of languages supported by the Whisper transcription service."""
    return success_response(
        data={"languages": SUPPORTED_LANGUAGES},
        message=f"Whisper model: {whisper_service._model_name}",
    )
