"""
BaazarSetu — Structured Logging
Uses python-json-logger for JSON output in production.
NEVER log: OTPs, JWT tokens, API keys, personal data.
"""
import logging
import sys
from pythonjsonlogger import jsonlogger

from app.core.config import settings


class SensitiveFilter(logging.Filter):
    """Remove sensitive fields from log records."""

    SENSITIVE_KEYS = {
        "password", "otp", "token", "access_token", "refresh_token",
        "api_key", "secret", "jwt", "authorization", "otp_code",
    }

    def filter(self, record: logging.LogRecord) -> bool:  # noqa: A003
        # Redact sensitive kwargs passed as extra={...}
        for key in list(vars(record).keys()):
            if key.lower() in self.SENSITIVE_KEYS:
                setattr(record, key, "***REDACTED***")
        return True


def setup_logging() -> None:
    """Configure application-wide logging."""
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Remove existing handlers
    root_logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(SensitiveFilter())

    if settings.LOG_FORMAT == "json":
        formatter = jsonlogger.JsonFormatter(
            fmt="%(asctime)s %(name)s %(levelname)s %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S",
        )
    else:
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    handler.setFormatter(formatter)
    root_logger.addHandler(handler)

    # Silence noisy third-party loggers
    for noisy in ["httpx", "httpcore", "asyncio", "multipart"]:
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Return a named logger."""
    return logging.getLogger(name)
