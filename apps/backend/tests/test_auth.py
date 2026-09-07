"""
BaazarSetu — Authentication API Tests
"""
import json
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient


@pytest.mark.asyncio
class TestSendOTP:
    async def test_send_otp_success(self, client: AsyncClient, artisan_phone: str):
        """OTP request should return verification_id in dev mode."""
        with patch("app.api.auth.AuthService.send_otp", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = "test-verification-id-123"
            response = await client.post(
                "/api/v1/auth/send-otp",
                json={"phone": artisan_phone},
            )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "verification_id" in data["data"]

    async def test_send_otp_invalid_phone(self, client: AsyncClient):
        """Invalid phone format should return 422."""
        response = await client.post(
            "/api/v1/auth/send-otp",
            json={"phone": "9876543210"},  # Missing +91
        )
        assert response.status_code == 422

    async def test_send_otp_too_short(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/auth/send-otp",
            json={"phone": "+91123"},
        )
        assert response.status_code == 422


@pytest.mark.asyncio
class TestVerifyOTP:
    async def test_verify_otp_creates_new_user(self, client: AsyncClient, artisan_phone: str):
        """First OTP verification creates a new user account."""
        with patch("app.api.auth.AuthService.verify_otp", new_callable=AsyncMock) as mock_verify:
            mock_verify.return_value = True
            response = await client.post(
                "/api/v1/auth/verify-otp",
                json={
                    "phone": artisan_phone,
                    "otp": "123456",
                    "verification_id": "test-id",
                    "role": "artisan",
                },
            )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "access_token" in data["data"]
        assert "refresh_token" in data["data"]
        assert data["data"]["user"]["phone"] == artisan_phone
        assert data["data"]["user"]["role"] == "artisan"

    async def test_verify_otp_invalid_otp_format(self, client: AsyncClient, artisan_phone: str):
        """OTP must be 6 digits."""
        response = await client.post(
            "/api/v1/auth/verify-otp",
            json={
                "phone": artisan_phone,
                "otp": "12345",  # 5 digits
                "verification_id": "test-id",
            },
        )
        assert response.status_code == 422

    async def test_verify_otp_wrong_otp(self, client: AsyncClient, artisan_phone: str):
        """Wrong OTP should return 400 with AUTH error."""
        from app.services.auth_service import AuthError
        with patch("app.api.auth.AuthService.verify_otp", new_callable=AsyncMock) as mock_verify:
            mock_verify.side_effect = AuthError("Invalid OTP.", code="OTP_INVALID")
            response = await client.post(
                "/api/v1/auth/verify-otp",
                json={
                    "phone": artisan_phone,
                    "otp": "999999",
                    "verification_id": "bad-id",
                },
            )
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False


@pytest.mark.asyncio
class TestProtectedEndpoints:
    async def test_me_without_token(self, client: AsyncClient):
        """GET /me without token should return 403."""
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 403

    async def test_me_with_invalid_token(self, client: AsyncClient):
        """GET /me with garbage token should return 401 or 403."""
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert response.status_code in (401, 403)


@pytest.mark.asyncio
class TestRefreshToken:
    async def test_refresh_token_invalid(self, client: AsyncClient):
        """Invalid refresh token should return 401."""
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "not.a.valid.token"},
        )
        assert response.status_code == 401


@pytest.mark.asyncio
class TestHealth:
    async def test_health_check(self, client: AsyncClient):
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

    async def test_root(self, client: AsyncClient):
        response = await client.get("/")
        assert response.status_code == 200
