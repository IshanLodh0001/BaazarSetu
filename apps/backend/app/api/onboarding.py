"""
BaazarSetu — Onboarding API
Artisan and buyer profile creation (text + voice).
"""
import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.artisan import Artisan
from app.models.buyer import Buyer
from app.schemas.artisan import ArtisanCreate, ArtisanUpdate, ArtisanOut
from app.schemas.buyer import BuyerCreate, BuyerUpdate, BuyerOut
from app.utils.dependencies import get_current_user
from app.utils.response import success_response, error_response
from app.services.storage_service import storage_service, StorageError
from app.services.whisper_service import whisper_service, WhisperError
from app.services.translation_service import translation_service
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


# ── Artisan Onboarding ────────────────────────────────────────────────────────

@router.post("/artisan", response_model=dict, status_code=200)
async def onboard_artisan(
    body: ArtisanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create or update artisan profile (text-based).
    Only artisan-role users can call this.
    """
    if current_user.role != UserRole.artisan:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=error_response("FORBIDDEN", "Only artisans can complete artisan onboarding"),
        )

    result = await db.execute(
        select(Artisan).where(Artisan.user_id == current_user.user_id)
    )
    artisan = result.scalar_one_or_none()

    if not artisan:
        artisan = Artisan(user_id=current_user.user_id)
        db.add(artisan)

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(artisan, field, value)

    artisan.onboarding_complete = True
    await db.commit()
    await db.refresh(artisan)

    logger.info(f"Artisan onboarding complete: {artisan.artisan_id}")
    return success_response(
        data=ArtisanOut.model_validate(artisan).model_dump(),
        message="Artisan profile created successfully",
    )


@router.post("/voice", response_model=dict, status_code=200)
async def voice_onboarding(
    audio: UploadFile = File(..., description="Audio file with artisan's self-description"),
    language: Optional[str] = Form(None, description="ISO-639-1 language code (e.g. hi, bn)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Voice-based artisan onboarding.
    Pipeline: Audio → Whisper → Regional transcript → Translation → Structured fields.
    Returns AI-extracted fields for artisan review before saving.
    """
    if current_user.role != UserRole.artisan:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=error_response("FORBIDDEN", "Only artisans can use voice onboarding"),
        )

    # Save audio
    audio_bytes = await audio.read()
    try:
        audio_path = await storage_service.save_audio(audio_bytes, audio.filename or "voice.wav")
    except StorageError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_response("STORAGE_ERROR", str(e)),
        )

    # Transcribe
    full_audio_path = storage_service.base_dir.parent / audio_path
    try:
        transcription = await whisper_service.transcribe(str(full_audio_path), language)
    except WhisperError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=error_response("TRANSCRIPTION_FAILED", str(e)),
        )

    detected_lang = transcription.get("language", "unknown")
    transcript_text = transcription.get("transcript", "")

    # Translate to English for field extraction
    translated = await translation_service.translate(transcript_text, detected_lang, "en")
    english_text = translated.get("translated_text", transcript_text)

    # Extract structured fields using Gemini
    extracted_fields = await _extract_onboarding_fields(english_text)

    return success_response(
        data={
            "transcription": {
                "detected_language": detected_lang,
                "transcript": transcript_text,
                "confidence": transcription.get("confidence"),
            },
            "translation": {
                "translated_text": english_text,
                "model_used": translated.get("model_used"),
            },
            "extracted_fields": extracted_fields,
            "note": "Please review and edit these fields before saving your profile",
        },
        message="Voice transcription and field extraction complete",
    )


async def _extract_onboarding_fields(english_text: str) -> dict:
    """Use Gemini to extract structured artisan onboarding fields from text."""
    try:
        from app.services.gemini_service import gemini_service
        if not gemini_service.enabled:
            return _simple_extract(english_text)

        prompt = f"""
Extract artisan onboarding information from this text. 
Return ONLY a JSON object, no explanation:

Text: {english_text}

JSON format:
{{
  "business_name": "extracted business name or null",
  "craft_type": "extracted craft type or null", 
  "experience_years": extracted number or null,
  "state": "extracted state name or null",
  "district": "extracted district or null",
  "bio": "brief self-description extracted or null"
}}
"""
        raw = await gemini_service._call_with_retry(prompt)
        return gemini_service._parse_json_response(raw)
    except Exception as e:
        logger.warning(f"Field extraction failed: {e}")
        return _simple_extract(english_text)


def _simple_extract(text: str) -> dict:
    """Minimal keyword extraction without AI."""
    return {
        "business_name": None,
        "craft_type": None,
        "experience_years": None,
        "state": None,
        "district": None,
        "bio": text[:500] if text else None,
    }


@router.put("/artisan", response_model=dict, status_code=200)
async def update_artisan_profile(
    body: ArtisanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update artisan profile fields."""
    result = await db.execute(
        select(Artisan).where(Artisan.user_id == current_user.user_id)
    )
    artisan = result.scalar_one_or_none()
    if not artisan:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Artisan profile not found"))

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(artisan, field, value)
    await db.commit()
    await db.refresh(artisan)
    return success_response(data=ArtisanOut.model_validate(artisan).model_dump())


@router.post("/artisan/profile-image", response_model=dict, status_code=200)
async def upload_profile_image(
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload artisan profile image."""
    image_bytes = await image.read()
    try:
        path = await storage_service.save_image(image_bytes, image.filename or "profile.jpg", "profiles")
    except StorageError as e:
        raise HTTPException(status_code=400, detail=error_response("STORAGE_ERROR", str(e)))

    current_user.profile_image = path
    await db.commit()
    return success_response(data={"profile_image": path}, message="Profile image uploaded")


# ── Buyer Onboarding ──────────────────────────────────────────────────────────

@router.post("/buyer", response_model=dict, status_code=200)
async def onboard_buyer(
    body: BuyerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create or update buyer profile."""
    if current_user.role != UserRole.buyer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=error_response("FORBIDDEN", "Only buyers can complete buyer onboarding"),
        )

    result = await db.execute(
        select(Buyer).where(Buyer.user_id == current_user.user_id)
    )
    buyer = result.scalar_one_or_none()

    if not buyer:
        buyer = Buyer(user_id=current_user.user_id)
        db.add(buyer)

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(buyer, field, value)

    await db.commit()
    await db.refresh(buyer)
    return success_response(
        data=BuyerOut.model_validate(buyer).model_dump(),
        message="Buyer profile created successfully",
    )


@router.put("/buyer", response_model=dict, status_code=200)
async def update_buyer_profile(
    body: BuyerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update buyer profile fields."""
    result = await db.execute(
        select(Buyer).where(Buyer.user_id == current_user.user_id)
    )
    buyer = result.scalar_one_or_none()
    if not buyer:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Buyer profile not found"))

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(buyer, field, value)
    await db.commit()
    await db.refresh(buyer)
    return success_response(data=BuyerOut.model_validate(buyer).model_dump())
