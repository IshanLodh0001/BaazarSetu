"""
BaazarSetu — Image, Voice, Catalog, Pricing, Cart, Order, Enquiry, Review, Matching, Translation Schemas
"""
import uuid
from typing import Optional, List, Any
from datetime import datetime, date
from pydantic import BaseModel, field_validator
from app.models.image import ProcessingStatus
from app.models.order import OrderStatus, PaymentStatus
from app.models.enquiry import EnquiryStatus
from app.models.inventory import StockStatus


# ── Image Schemas ─────────────────────────────────────────────────────────────

class ImageUploadResponse(BaseModel):
    image_id: uuid.UUID
    original_path: str
    message: str


class ImageProcessRequest(BaseModel):
    remove_background: bool = True
    enhance: bool = True
    resize_for_marketplace: bool = True


class ImageOut(BaseModel):
    image_id: uuid.UUID
    product_id: Optional[uuid.UUID] = None
    original_path: str
    processed_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    background_removed: bool
    lighting_improved: bool
    crop_applied: bool
    is_primary: bool
    processing_status: ProcessingStatus
    processing_metadata: Optional[dict] = None

    model_config = {"from_attributes": True}


# ── Voice Schemas ─────────────────────────────────────────────────────────────

class VoiceTranscribeResponse(BaseModel):
    voice_id: uuid.UUID
    detected_language: Optional[str] = None
    transcript: Optional[str] = None
    translated_text: Optional[str] = None
    confidence: Optional[float] = None
    duration_seconds: Optional[float] = None


# ── Catalog Schemas ───────────────────────────────────────────────────────────

class CatalogGenerateRequest(BaseModel):
    product_id: Optional[uuid.UUID] = None
    seller_text: Optional[str] = None
    voice_transcript: Optional[str] = None
    source_language: str = "en"
    target_language: str = "en"


class CatalogOut(BaseModel):
    catalog_id: uuid.UUID
    product_id: uuid.UUID
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    craft_type: Optional[str] = None
    material: Optional[str] = None
    color: Optional[str] = None
    tags: Optional[List[str]] = []
    seo_keywords: Optional[List[str]] = []

    model_config = {"from_attributes": True}


# ── Pricing Schemas ───────────────────────────────────────────────────────────

class PricingRequest(BaseModel):
    product_id: uuid.UUID
    raw_material_cost: float = 0.0
    labour_cost: float = 0.0
    production_time_hours: float = 0.0
    packaging_cost: float = 0.0
    transport_cost: float = 0.0
    quantity: int = 1
    location: Optional[str] = None

    @field_validator("raw_material_cost", "labour_cost", "packaging_cost", "transport_cost")
    @classmethod
    def non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Cost values cannot be negative")
        return v


class PricingResponse(BaseModel):
    pricing_id: uuid.UUID
    product_id: uuid.UUID
    minimum_price: float
    suggested_price: float
    maximum_price: float
    expected_profit: float
    profit_margin: float
    market_average_price: Optional[float] = None
    confidence: float
    explanation: str
    model_used: str

    model_config = {"from_attributes": True}


# ── Cart Schemas ──────────────────────────────────────────────────────────────

class AddToCartRequest(BaseModel):
    product_id: uuid.UUID
    quantity: int = 1

    @field_validator("quantity")
    @classmethod
    def validate_qty(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Quantity must be at least 1")
        return v


class UpdateCartItemRequest(BaseModel):
    quantity: int

    @field_validator("quantity")
    @classmethod
    def validate_qty(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Quantity must be at least 1")
        return v


class CartItemOut(BaseModel):
    cart_item_id: uuid.UUID
    product_id: uuid.UUID
    quantity: int
    unit_price: float
    total_price: float

    model_config = {"from_attributes": True}


class CartOut(BaseModel):
    cart_id: uuid.UUID
    buyer_id: uuid.UUID
    total_items: int
    subtotal: float
    items: List[CartItemOut] = []

    model_config = {"from_attributes": True}


# ── Order Schemas ─────────────────────────────────────────────────────────────

class OrderCreate(BaseModel):
    shipping_address: str
    notes: Optional[str] = None


class OrderItemOut(BaseModel):
    order_item_id: uuid.UUID
    product_id: uuid.UUID
    quantity: int
    unit_price: float
    total_price: float

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    order_id: uuid.UUID
    buyer_id: uuid.UUID
    seller_id: uuid.UUID
    total_quantity: int
    subtotal: float
    shipping_charge: float
    total_amount: float
    payment_method: Optional[str] = None
    payment_status: PaymentStatus
    order_status: OrderStatus
    shipping_address: Optional[str] = None
    tracking_number: Optional[str] = None
    notes: Optional[str] = None
    order_date: datetime
    items: List[OrderItemOut] = []

    model_config = {"from_attributes": True}


# ── Enquiry Schemas ───────────────────────────────────────────────────────────

class EnquiryCreate(BaseModel):
    seller_id: uuid.UUID
    product_id: Optional[uuid.UUID] = None
    required_quantity: int = 1
    proposed_price: Optional[float] = None
    budget: Optional[float] = None
    delivery_date: Optional[date] = None
    message: Optional[str] = None


class EnquiryUpdate(BaseModel):
    status: EnquiryStatus
    counter_offer_price: Optional[float] = None
    counter_offer_message: Optional[str] = None


class EnquiryOut(BaseModel):
    enquiry_id: uuid.UUID
    buyer_id: uuid.UUID
    seller_id: uuid.UUID
    product_id: Optional[uuid.UUID] = None
    required_quantity: int
    proposed_price: Optional[float] = None
    budget: Optional[float] = None
    delivery_date: Optional[date] = None
    message: Optional[str] = None
    counter_offer_price: Optional[float] = None
    counter_offer_message: Optional[str] = None
    status: EnquiryStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Review Schemas ────────────────────────────────────────────────────────────

class ReviewCreate(BaseModel):
    rating: int
    review_text: Optional[str] = None
    order_id: Optional[uuid.UUID] = None

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: int) -> int:
        if not 1 <= v <= 5:
            raise ValueError("Rating must be between 1 and 5")
        return v


class ReviewOut(BaseModel):
    review_id: uuid.UUID
    buyer_id: uuid.UUID
    product_id: uuid.UUID
    rating: int
    review_text: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Inventory Schemas ─────────────────────────────────────────────────────────

class InventoryUpdate(BaseModel):
    available_quantity: Optional[int] = None
    reorder_level: Optional[int] = None


class InventoryOut(BaseModel):
    inventory_id: uuid.UUID
    product_id: uuid.UUID
    available_quantity: int
    reserved_quantity: int
    sold_quantity: int
    reorder_level: int
    stock_status: StockStatus

    model_config = {"from_attributes": True}


# ── Matching Schemas ──────────────────────────────────────────────────────────

class MatchRequest(BaseModel):
    product_category: Optional[str] = None
    craft_type: Optional[str] = None
    required_quantity: int = 1
    budget: Optional[float] = None
    location: Optional[str] = None
    delivery_date: Optional[date] = None
    requirements: Optional[str] = None


class ArtisanMatchOut(BaseModel):
    artisan_id: uuid.UUID
    business_name: Optional[str] = None
    craft_type: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    rating: float
    match_score: float
    match_reason: str
    estimated_price: Optional[float] = None
    available_quantity: Optional[int] = None


class MatchResponse(BaseModel):
    matches: List[ArtisanMatchOut]
    total_found: int


# ── Translation Schemas ───────────────────────────────────────────────────────

class TranslationRequest(BaseModel):
    text: str
    source_language: str
    target_language: str


class TranslationResponse(BaseModel):
    original_text: str
    translated_text: str
    source_language: str
    target_language: str
    model_used: str
    success: bool
    error: Optional[str] = None


# ── Job Status Schemas ────────────────────────────────────────────────────────

class JobStatusOut(BaseModel):
    job_id: uuid.UUID
    job_type: str
    status: str
    result: Optional[dict] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
