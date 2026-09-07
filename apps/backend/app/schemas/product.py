"""
BaazarSetu — Product Schemas
"""
import uuid
from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, field_validator
from app.models.product import ProductStatus


class ProductCreate(BaseModel):
    product_name: str
    category: Optional[str] = None
    subcategory: Optional[str] = None
    description: Optional[str] = None
    material: Optional[str] = None
    colour: Optional[str] = None
    craft_type: Optional[str] = None
    style: Optional[str] = None
    tags: Optional[List[str]] = []
    price: float = 0.0
    status: ProductStatus = ProductStatus.draft

    @field_validator("price")
    @classmethod
    def validate_price(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Price cannot be negative")
        return v

    @field_validator("product_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Product name must be at least 2 characters")
        return v


class ProductUpdate(BaseModel):
    product_name: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    description: Optional[str] = None
    material: Optional[str] = None
    colour: Optional[str] = None
    craft_type: Optional[str] = None
    style: Optional[str] = None
    tags: Optional[List[str]] = None
    price: Optional[float] = None
    status: Optional[ProductStatus] = None


class ProductOut(BaseModel):
    product_id: uuid.UUID
    seller_id: uuid.UUID
    product_name: str
    category: Optional[str] = None
    subcategory: Optional[str] = None
    description: Optional[str] = None
    material: Optional[str] = None
    colour: Optional[str] = None
    craft_type: Optional[str] = None
    tags: Optional[List[str]] = []
    price: float
    ai_suggested_price: Optional[float] = None
    market_min_price: Optional[float] = None
    market_max_price: Optional[float] = None
    original_image: Optional[str] = None
    enhanced_image: Optional[str] = None
    thumbnail: Optional[str] = None
    rating: float
    review_count: int
    ai_confidence: Optional[float] = None
    status: ProductStatus
    is_featured: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProductListOut(BaseModel):
    product_id: uuid.UUID
    seller_id: uuid.UUID
    product_name: str
    category: Optional[str] = None
    craft_type: Optional[str] = None
    price: float
    thumbnail: Optional[str] = None
    rating: float
    review_count: int
    status: ProductStatus

    model_config = {"from_attributes": True}
