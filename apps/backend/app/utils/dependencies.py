"""
BaazarSetu — FastAPI Dependencies
JWT validation, role enforcement, Redis injection.
"""
import uuid
from typing import Annotated, Optional

import redis.asyncio as aioredis
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.security import verify_access_token
from app.core.database import get_db
from app.core.logging import get_logger
from app.models.user import User, UserRole
from app.models.artisan import Artisan
from app.models.buyer import Buyer

logger = get_logger(__name__)
security = HTTPBearer()

# Redis connection pool (created once at import)
_redis_pool: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_pool


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> User:
    """
    Validate JWT and return the User object.
    Checks token blacklist in Redis.
    """
    token = credentials.credentials
    payload = verify_access_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "TOKEN_INVALID", "message": "Invalid or expired access token"},
        )

    # Check blacklist
    is_blacklisted = await redis.exists(f"token_blacklist:{token}")
    if is_blacklisted:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "TOKEN_REVOKED", "message": "Token has been revoked"},
        )

    user_id = payload.get("sub")
    try:
        uid = uuid.UUID(user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "TOKEN_MALFORMED", "message": "Malformed token payload"},
        )

    result = await db.execute(select(User).where(User.user_id == uid))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "USER_NOT_FOUND", "message": "User not found"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "USER_INACTIVE", "message": "User account is inactive"},
        )

    return user


async def require_artisan(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> tuple[User, Artisan]:
    """Require artisan role and return (user, artisan) tuple."""
    if current_user.role != UserRole.artisan:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Artisan access required"},
        )
    result = await db.execute(
        select(Artisan).where(Artisan.user_id == current_user.user_id)
    )
    artisan = result.scalar_one_or_none()
    if not artisan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PROFILE_INCOMPLETE", "message": "Artisan profile not found. Please complete onboarding."},
        )
    return current_user, artisan


async def require_buyer(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> tuple[User, Buyer]:
    """Require buyer role and return (user, buyer) tuple."""
    if current_user.role != UserRole.buyer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Buyer access required"},
        )
    result = await db.execute(
        select(Buyer).where(Buyer.user_id == current_user.user_id)
    )
    buyer = result.scalar_one_or_none()
    if not buyer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PROFILE_INCOMPLETE", "message": "Buyer profile not found. Please complete onboarding."},
        )
    return current_user, buyer
