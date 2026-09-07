"""
BaazarSetu — Authentication API
POST /api/v1/auth/send-otp
POST /api/v1/auth/verify-otp
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import redis.asyncio as aioredis

from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.artisan import Artisan
from app.models.buyer import Buyer
from app.schemas.auth import (
    SendOTPRequest, SendOTPResponse,
    VerifyOTPRequest, TokenResponse,
    RefreshTokenRequest, UserOut,
)
from app.services.auth_service import AuthService, AuthError
from app.utils.dependencies import get_current_user, get_redis
from app.utils.response import success_response, error_response
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


def _get_auth_service(redis: aioredis.Redis = Depends(get_redis)) -> AuthService:
    return AuthService(redis)


@router.post("/send-otp", response_model=dict, status_code=200)
async def send_otp(
    request: SendOTPRequest,
    auth: AuthService = Depends(_get_auth_service),
):
    """
    Send a 6-digit OTP to the given phone number.
    In development mode, a fixed OTP is used (see OTP_DEV_CODE in .env).
    
    Rate limited to OTP_MAX_ATTEMPTS per hour per phone.
    """
    try:
        verification_id = await auth.send_otp(request.phone)
        logger.info(f"OTP request for phone ending {request.phone[-4:]}")
        return success_response(
            data={"verification_id": verification_id},
            message="OTP sent successfully",
        )
    except AuthError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS
            if e.code == "OTP_RATE_LIMIT"
            else status.HTTP_400_BAD_REQUEST,
            detail=error_response(e.code, e.message),
        )


@router.post("/verify-otp", response_model=dict, status_code=200)
async def verify_otp(
    body: VerifyOTPRequest,
    db: AsyncSession = Depends(get_db),
    auth: AuthService = Depends(_get_auth_service),
):
    """
    Verify OTP and issue JWT access + refresh tokens.
    Creates user account on first login.
    """
    try:
        await auth.verify_otp(body.phone, body.otp, body.verification_id)
    except AuthError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_response(e.code, e.message),
        )

    # Get or create user
    result = await db.execute(select(User).where(User.phone == body.phone))
    user = result.scalar_one_or_none()

    if not user:
        # New user — create account
        user = User(
            phone=body.phone,
            role=body.role or UserRole.artisan,
            is_verified=True,
        )
        db.add(user)
        await db.flush()

        # Create profile stub
        if user.role == UserRole.artisan:
            artisan = Artisan(user_id=user.user_id)
            db.add(artisan)
        elif user.role == UserRole.buyer:
            buyer = Buyer(user_id=user.user_id)
            db.add(buyer)

        await db.commit()
        await db.refresh(user)
        logger.info(f"New {user.role} registered: {user.user_id}")
    else:
        user.is_verified = True
        await db.commit()
        logger.info(f"User logged in: {user.user_id}")

    tokens = auth.create_tokens(str(user.user_id), user.role)

    return success_response(
        data={
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "token_type": "bearer",
            "user": UserOut.model_validate(user).model_dump(),
        },
        message="Login successful",
    )


@router.post("/refresh", response_model=dict, status_code=200)
async def refresh_token(
    body: RefreshTokenRequest,
    auth: AuthService = Depends(_get_auth_service),
):
    """Refresh access token using a valid refresh token."""
    try:
        new_tokens = await auth.refresh_access_token(body.refresh_token)
        return success_response(data=new_tokens, message="Token refreshed")
    except AuthError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_response(e.code, e.message),
        )


@router.post("/logout", response_model=dict, status_code=200)
async def logout(
    body: RefreshTokenRequest,
    auth: AuthService = Depends(_get_auth_service),
):
    """Invalidate refresh token (blacklist in Redis)."""
    await auth.logout(body.refresh_token)
    return success_response(message="Logged out successfully")


@router.get("/me", response_model=dict, status_code=200)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return currently authenticated user's profile."""
    return success_response(
        data=UserOut.model_validate(current_user).model_dump()
    )
