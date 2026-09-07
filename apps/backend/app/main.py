"""
BaazarSetu — FastAPI Application Entry Point
"""
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.core.database import init_db, close_db
from app.core.logging import setup_logging, get_logger

# Setup logging before anything else
setup_logging()
logger = get_logger(__name__)

# Import all routers
from app.api.auth import router as auth_router
from app.api.onboarding import router as onboarding_router
from app.api.products import router as products_router
from app.api.images import router as images_router
from app.api.voice import router as voice_router
from app.api.translation import router as translation_router
from app.api.catalog import router as catalog_router
from app.api.pricing import router as pricing_router
from app.api.marketplace import router as marketplace_router, search_router
from app.api.matching import router as matching_router
from app.api.enquiries import router as enquiries_router
from app.api.cart import router as cart_router
from app.api.orders import router as orders_router
from app.api.inventory import router as inventory_router
from app.api.reviews import router as reviews_router
from app.api.assistant import router as assistant_router
from app.api.notifications import router as notifications_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    logger.info(f"Starting {settings.APP_NAME} in {settings.APP_ENV} mode")
    await init_db()
    logger.info("Application startup complete")
    yield
    await close_db()
    logger.info("Application shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    description="""
## BaazarSetu — AI-Driven Market Linkage and Smart Cataloging for Marginalized Artisans

A production-ready backend for an AI-powered artisan marketplace.

### Features
- 📱 Mobile OTP authentication (JWT)
- 🎙️ Multilingual voice onboarding (Whisper + IndicTrans2)
- 🖼️ AI Image Studio (rembg background removal)
- 🤖 Gemini product recognition and catalog generation
- 💰 Dynamic pricing (XGBoost + fallback algorithm)
- 🛒 Marketplace, cart, orders
- 🤝 B2B matching and bulk enquiries
- 🧠 AI business assistant

### Authentication
Use `POST /api/v1/auth/send-otp` → `POST /api/v1/auth/verify-otp` to get a JWT token.
Then add `Authorization: Bearer <token>` to all authenticated requests.
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static Files (uploaded images) ───────────────────────────────────────────
import os
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory="."), name="static")

# ── Request Logging Middleware ────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    logger.info(
        "HTTP request",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": round(duration * 1000, 2),
        },
    )
    return response

# ── Exception Handlers ────────────────────────────────────────────────────────
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first = errors[0] if errors else {}
    field = ".".join(str(loc) for loc in first.get("loc", [])[1:])
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": first.get("msg", "Validation error"),
                "field": field,
                "details": errors,
            },
        },
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred. Please try again.",
            },
        },
    )

# ── Register Routers ──────────────────────────────────────────────────────────
PREFIX = settings.API_V1_PREFIX

app.include_router(auth_router, prefix=PREFIX)
app.include_router(onboarding_router, prefix=PREFIX)
app.include_router(products_router, prefix=PREFIX)
app.include_router(images_router, prefix=PREFIX)
app.include_router(voice_router, prefix=PREFIX)
app.include_router(translation_router, prefix=PREFIX)
app.include_router(catalog_router, prefix=PREFIX)
app.include_router(pricing_router, prefix=PREFIX)
app.include_router(marketplace_router, prefix=PREFIX)
app.include_router(search_router, prefix=PREFIX)
app.include_router(matching_router, prefix=PREFIX)
app.include_router(enquiries_router, prefix=PREFIX)
app.include_router(cart_router, prefix=PREFIX)
app.include_router(orders_router, prefix=PREFIX)
app.include_router(inventory_router, prefix=PREFIX)
app.include_router(reviews_router, prefix=PREFIX)
app.include_router(assistant_router, prefix=PREFIX)
app.include_router(notifications_router, prefix=PREFIX)

# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "env": settings.APP_ENV,
    }

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "docs": "/docs",
        "health": "/health",
    }
