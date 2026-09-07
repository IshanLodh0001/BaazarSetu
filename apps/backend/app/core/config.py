"""
BaazarSetu — Core Configuration
All settings are read from environment variables.
Never hard-code secrets here.
"""
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────────────────────
    APP_NAME: str = "BaazarSetu"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    SECRET_KEY: str = "change_me_to_a_long_random_secret"

    # ── Server ───────────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8081"

    @property
    def origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://baazarsetu:baazarsetu_pass@localhost:5432/baazarsetu_db"
    SYNC_DATABASE_URL: str = "postgresql://baazarsetu:baazarsetu_pass@localhost:5432/baazarsetu_db"

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── JWT ──────────────────────────────────────────────────────────────────
    JWT_SECRET: str = "change_me_jwt_secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── OTP ──────────────────────────────────────────────────────────────────
    OTP_MODE: str = "development"      # development | production
    OTP_DEV_CODE: str = "123456"
    OTP_EXPIRE_MINUTES: int = 10
    OTP_MAX_ATTEMPTS: int = 3
    OTP_PROVIDER: str = "none"         # none | twilio | msg91
    OTP_API_KEY: Optional[str] = None
    OTP_SENDER_ID: str = "BAAZAR"
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_FROM_NUMBER: Optional[str] = None
    MSG91_AUTH_KEY: Optional[str] = None
    MSG91_TEMPLATE_ID: Optional[str] = None

    # ── File Storage ─────────────────────────────────────────────────────────
    STORAGE_TYPE: str = "local"        # local | s3 | gcs | cloudinary
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 20

    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "ap-south-1"
    AWS_BUCKET_NAME: Optional[str] = None

    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None

    # ── Gemini AI ────────────────────────────────────────────────────────────
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"
    GEMINI_TIMEOUT_SECONDS: int = 30
    GEMINI_MAX_RETRIES: int = 3

    # ── Whisper ──────────────────────────────────────────────────────────────
    WHISPER_MODEL: str = "small"
    WHISPER_DEVICE: str = "cpu"
    WHISPER_TIMEOUT_SECONDS: int = 120

    # ── IndicTrans2 ──────────────────────────────────────────────────────────
    INDICTRANS_MODEL_PATH: str = "models/indictrans2-indic-en-1B"
    INDICTRANS_DEVICE: str = "cpu"
    INDICTRANS_ENABLED: bool = False

    # ── rembg ────────────────────────────────────────────────────────────────
    REMBG_MODEL: str = "u2net"
    REMBG_ENABLED: bool = True

    # ── PaddleOCR ────────────────────────────────────────────────────────────
    PADDLEOCR_ENABLED: bool = True
    PADDLEOCR_LANG: str = "en"

    # ── CLIP ─────────────────────────────────────────────────────────────────
    CLIP_ENABLED: bool = False
    CLIP_MODEL: str = "ViT-B/32"

    # ── Pricing / ML ─────────────────────────────────────────────────────────
    XGBOOST_MODEL_PATH: str = "models/pricing_model.joblib"
    PRICING_USE_FALLBACK: bool = True

    # ── Rate Limiting ────────────────────────────────────────────────────────
    RATE_LIMIT_AUTH: str = "5/minute"
    RATE_LIMIT_API: str = "100/minute"

    # ── Logging ──────────────────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    # ── Marketplace ──────────────────────────────────────────────────────────
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    @field_validator("APP_ENV")
    @classmethod
    def validate_env(cls, v: str) -> str:
        allowed = {"development", "staging", "production"}
        if v not in allowed:
            raise ValueError(f"APP_ENV must be one of {allowed}")
        return v

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def is_development(self) -> bool:
        return self.APP_ENV == "development"


settings = Settings()
