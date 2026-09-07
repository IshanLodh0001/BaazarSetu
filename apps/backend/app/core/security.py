"""
BaazarSetu — Security Utilities
JWT creation/verification, OTP generation, token hashing.
NEVER log tokens or OTPs.
"""
import secrets
import hashlib
import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Dict

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ─── Password / Hash Utilities ────────────────────────────────────────────────

def hash_value(value: str) -> str:
    """SHA-256 hash — used for OTP storage, never for passwords."""
    return hashlib.sha256(value.encode()).hexdigest()


def verify_hash(plain: str, hashed: str) -> bool:
    return hash_value(plain) == hashed


# ─── OTP ──────────────────────────────────────────────────────────────────────

def generate_otp(length: int = 6) -> str:
    """Generate a numeric OTP string."""
    if settings.OTP_MODE == "development":
        return settings.OTP_DEV_CODE
    return "".join(random.choices(string.digits, k=length))


def generate_verification_id() -> str:
    """Unique token used as Redis key for OTP lookup."""
    return secrets.token_urlsafe(32)


# ─── JWT ──────────────────────────────────────────────────────────────────────

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: Dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT.
    Raises jose.JWTError on failure.
    """
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None


def verify_refresh_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = decode_token(token)
        if payload.get("type") != "refresh":
            return None
        return payload
    except JWTError:
        return None
