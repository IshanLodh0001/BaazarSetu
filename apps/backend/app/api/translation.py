"""
BaazarSetu — Translation API
POST /api/v1/translation/translate
"""
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.user import User
from app.utils.dependencies import get_current_user
from app.utils.response import success_response, error_response
from app.services.translation_service import translation_service
from app.schemas.schemas import TranslationRequest

router = APIRouter(prefix="/translation", tags=["Translation"])


@router.post("/translate", response_model=dict, status_code=200)
async def translate_text(
    body: TranslationRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Translate text using IndicTrans2 (primary) or Gemini (fallback).
    
    Supports: Indic regional languages ↔ Hindi ↔ English
    See /translation/languages for supported language codes.
    """
    if not body.text.strip():
        raise HTTPException(
            status_code=400,
            detail=error_response("VALIDATION_ERROR", "Text cannot be empty"),
        )

    result = await translation_service.translate(
        body.text, body.source_language, body.target_language
    )
    return success_response(data=result)


@router.get("/languages", response_model=dict, status_code=200)
async def get_languages():
    """Get all supported language codes and their names."""
    return success_response(
        data={
            "languages": translation_service.supported_languages,
            "primary_model": "indictrans2" if translation_service._enabled else "gemini-fallback",
        }
    )
