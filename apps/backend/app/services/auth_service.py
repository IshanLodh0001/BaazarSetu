"""
BaazarSetu — Auth Service
OTP generation, Redis storage, JWT management.
"""
import json
import uuid
from datetime import timedelta
from typing import Optional, Dict, Any

import redis.asyncio as aioredis

from app.core.config import settings
from app.core.security import (
    generate_otp, generate_verification_id,
    hash_value, verify_hash,
    create_access_token, create_refresh_token,
    verify_refresh_token,
)
from app.core.logging import get_logger

logger = get_logger(__name__)


class AuthError(Exception):
    def __init__(self, message: str, code: str = "AUTH_ERROR"):
        super().__init__(message)
        self.code = code
        self.message = message


class AuthService:
    def __init__(self, redis_client: aioredis.Redis) -> None:
        self.redis = redis_client

    # ── OTP Keys ──────────────────────────────────────────────────────────────

    def _otp_key(self, verification_id: str) -> str:
        return f"otp:{verification_id}"

    def _attempts_key(self, phone: str) -> str:
        return f"otp_attempts:{phone}"

    # ── Send OTP ──────────────────────────────────────────────────────────────

    async def send_otp(self, phone: str) -> str:
        """
        Generate OTP, store hashed in Redis, return verification_id.
        In development mode: uses fixed OTP from settings.
        """
        # Check rate limit
        attempts_key = self._attempts_key(phone)
        attempts = await self.redis.get(attempts_key)
        if attempts and int(attempts) >= settings.OTP_MAX_ATTEMPTS:
            raise AuthError(
                "Too many OTP requests. Please wait before trying again.",
                code="OTP_RATE_LIMIT",
            )

        otp = generate_otp()
        verification_id = generate_verification_id()

        # Store hashed OTP with phone in Redis (TTL = OTP_EXPIRE_MINUTES)
        otp_data = json.dumps({"phone": phone, "otp_hash": hash_value(otp)})
        expire_seconds = settings.OTP_EXPIRE_MINUTES * 60

        await self.redis.set(self._otp_key(verification_id), otp_data, ex=expire_seconds)

        # Increment attempt counter (TTL = 1 hour)
        await self.redis.incr(attempts_key)
        await self.redis.expire(attempts_key, 3600)

        # Send OTP via configured provider
        await self._dispatch_otp(phone, otp)

        # In development, log a masked indicator but NEVER the actual OTP
        if settings.is_development:
            logger.debug(f"[DEV] OTP generated for {phone[-4:]} (use dev OTP code)")
        else:
            logger.info(f"OTP sent to phone ending {phone[-4:]}")

        return verification_id

    async def _dispatch_otp(self, phone: str, otp: str) -> None:
        """Send OTP via configured SMS provider."""
        if settings.OTP_MODE == "development":
            return  # No SMS in development
        if settings.OTP_PROVIDER == "twilio":
            await self._send_twilio(phone, otp)
        elif settings.OTP_PROVIDER == "msg91":
            await self._send_msg91(phone, otp)
        else:
            logger.warning("No OTP provider configured; OTP not sent.")

    async def _send_twilio(self, phone: str, otp: str) -> None:
        """Send OTP via Twilio SMS."""
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json",
                    auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                    data={
                        "From": settings.TWILIO_FROM_NUMBER,
                        "To": phone,
                        "Body": f"Your BaazarSetu OTP is: {otp}. Valid for {settings.OTP_EXPIRE_MINUTES} minutes.",
                    },
                    timeout=10,
                )
                resp.raise_for_status()
        except Exception as e:
            logger.error(f"Twilio OTP send failed: {e}")
            raise AuthError("Failed to send OTP via SMS", code="OTP_SEND_FAILED")

    async def _send_msg91(self, phone: str, otp: str) -> None:
        """Send OTP via MSG91."""
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.msg91.com/api/v5/otp",
                    json={
                        "authkey": settings.MSG91_AUTH_KEY,
                        "template_id": settings.MSG91_TEMPLATE_ID,
                        "mobile": phone.lstrip("+"),
                        "otp": otp,
                    },
                    timeout=10,
                )
                resp.raise_for_status()
        except Exception as e:
            logger.error(f"MSG91 OTP send failed: {e}")
            raise AuthError("Failed to send OTP via SMS", code="OTP_SEND_FAILED")

    # ── Verify OTP ────────────────────────────────────────────────────────────

    async def verify_otp(self, phone: str, otp: str, verification_id: str) -> bool:
        """
        Verify OTP against stored hash.
        Returns True on success, raises AuthError on failure.
        """
        stored = await self.redis.get(self._otp_key(verification_id))
        if not stored:
            raise AuthError("OTP expired or invalid verification ID.", code="OTP_EXPIRED")

        data = json.loads(stored)
        if data["phone"] != phone:
            raise AuthError("Phone number mismatch.", code="OTP_PHONE_MISMATCH")

        if not verify_hash(otp, data["otp_hash"]):
            raise AuthError("Invalid OTP.", code="OTP_INVALID")

        # Consume OTP — delete from Redis
        await self.redis.delete(self._otp_key(verification_id))
        await self.redis.delete(self._attempts_key(phone))
        return True

    # ── Token Generation ──────────────────────────────────────────────────────

    def create_tokens(self, user_id: str, role: str) -> Dict[str, str]:
        payload = {"sub": str(user_id), "role": role}
        return {
            "access_token": create_access_token(payload),
            "refresh_token": create_refresh_token(payload),
        }

    async def refresh_access_token(self, refresh_token: str) -> Dict[str, str]:
        payload = verify_refresh_token(refresh_token)
        if not payload:
            raise AuthError("Invalid or expired refresh token.", code="TOKEN_INVALID")
        user_id = payload.get("sub")
        role = payload.get("role")
        if not user_id or not role:
            raise AuthError("Malformed token.", code="TOKEN_MALFORMED")
        new_access = create_access_token({"sub": user_id, "role": role})
        return {"access_token": new_access, "token_type": "bearer"}

    async def logout(self, refresh_token: str) -> None:
        """
        Invalidate a refresh token by adding it to a Redis blacklist.
        Access tokens are short-lived so they expire naturally.
        """
        payload = verify_refresh_token(refresh_token)
        if payload:
            exp = payload.get("exp", 0)
            import time
            ttl = max(int(exp - time.time()), 1)
            await self.redis.set(f"token_blacklist:{refresh_token}", "1", ex=ttl)
        # Even if token is already invalid, silently succeed

    async def is_token_blacklisted(self, token: str) -> bool:
        return bool(await self.redis.exists(f"token_blacklist:{token}"))
