# BaazarSetu — AI-Driven Market Linkage for Marginalized Artisans

BaazarSetu is a production-ready, AI-powered cross-platform marketplace backend designed specifically for marginalized artisans and micro-entrepreneurs. It acts as a virtual business manager, using AI to simplify cataloging, pricing, and B2B/B2C commerce.

## Architecture

This is a modular, API-first backend built with **FastAPI**.
- **Database**: PostgreSQL (via async SQLAlchemy 2.0)
- **Cache/Sessions**: Redis
- **Background Tasks**: FastAPI BackgroundTasks (easily swappable to Celery)
- **AI/ML Layer**: 
    - Google Gemini (Multimodal Cataloging, Business Assistant)
    - Whisper (Local Speech-to-Text)
    - IndicTrans2 (Local Translation for Indian languages)
    - rembg & Pillow (Background removal, Image enhancement)
    - PaddleOCR (Text extraction from product labels)
    - XGBoost (Dynamic Pricing)

## Core Features

1. **Passwordless Auth**: OTP-based login tailored for low-literacy users, secured by JWT.
2. **Voice Onboarding**: Speak to onboard! Audio is processed via Whisper, translated, and structured via AI.
3. **AI Image Studio**: Auto-removes backgrounds and enhances product images.
4. **Smart Cataloging**: Upload an image and some voice context; Gemini generates SEO-optimized product titles, descriptions, tags, and categories.
5. **Dynamic Pricing**: Evaluates raw material costs, labor, and market rates to recommend minimum, suggested, and maximum prices.
6. **B2B Matching Algorithm**: Scores artisans against buyer bulk requests based on craft, category, inventory, location, and rating.
7. **Business Assistant**: A chatbot that accesses *real* database metrics (sales, inventory) to advise the artisan in their native language.

## Getting Started

### Prerequisites
- Python 3.11+
- PostgreSQL
- Redis
- Docker (optional)

### Local Setup

1. **Clone and setup virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Environment Variables**:
   Copy the example config and edit it (at least add your `GEMINI_API_KEY`).
   ```bash
   cp .env.example .env
   ```

3. **Database Setup**:
   Ensure PostgreSQL is running. Create a database `baazarsetu_db` with user `baazarsetu` (matching your `.env`).
   Run Alembic migrations to create tables:
   ```bash
   alembic upgrade head
   ```

4. **Seed Database (Optional)**:
   Populate the database with sample artisans, buyers, products, and market data:
   ```bash
   python scripts/seed_data.py
   ```

5. **Run the Server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

6. **API Documentation**:
   Open `http://localhost:8000/docs` in your browser.

### Docker Setup

You can run the entire stack (PostgreSQL, Redis, Backend API) via Docker Compose.
```bash
docker-compose up -d --build
```

## Running Tests

Tests use an in-memory SQLite database and mocked external services.
```bash
pytest tests/
```

## AI Models Configuration

- **Whisper & rembg**: Automatically downloaded on first use (if enabled).
- **IndicTrans2**: Must be downloaded manually to the `models/` directory if `INDICTRANS_ENABLED=true`.
- **XGBoost Pricing**: Uses `models/pricing_model.joblib` if present; otherwise, falls back to a deterministic algorithm.

## Security Notes
- API Keys are exclusively read from `.env` and never exposed via API endpoints.
- JWT tokens are validated for expiration and blacklisted on logout (via Redis).
- User roles (artisan/buyer) strictly enforce endpoint authorization.
