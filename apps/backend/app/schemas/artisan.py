"""
BaazarSetu — Artisan Schemas
"""
import uuid
from typing import Optional
from pydantic import BaseModel
from app.models.artisan import VerificationStatus


class ArtisanCreate(BaseModel):
    business_name: Optional[str] = None
    craft_type: Optional[str] = None
    experience_years: int = 0
    state: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None
    production_capacity: Optional[int] = None


class ArtisanUpdate(BaseModel):
    business_name: Optional[str] = None
    craft_type: Optional[str] = None
    experience_years: Optional[int] = None
    state: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None
    production_capacity: Optional[int] = None


class ArtisanOut(BaseModel):
    artisan_id: uuid.UUID
    user_id: uuid.UUID
    business_name: Optional[str] = None
    craft_type: Optional[str] = None
    experience_years: int
    state: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None
    verification_status: VerificationStatus
    rating: float
    total_products: int
    total_orders: int
    production_capacity: Optional[int] = None
    onboarding_complete: bool

    model_config = {"from_attributes": True}


class ArtisanPublicOut(BaseModel):
    """Public artisan profile — no private fields."""
    artisan_id: uuid.UUID
    business_name: Optional[str] = None
    craft_type: Optional[str] = None
    experience_years: int
    state: Optional[str] = None
    district: Optional[str] = None
    bio: Optional[str] = None
    verification_status: VerificationStatus
    rating: float
    total_products: int

    model_config = {"from_attributes": True}
