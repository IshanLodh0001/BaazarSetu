"""
BaazarSetu — Buyer Schemas
"""
import uuid
from typing import Optional
from pydantic import BaseModel
from app.models.buyer import BuyerType


class BuyerCreate(BaseModel):
    buyer_type: BuyerType = BuyerType.individual
    company_name: Optional[str] = None
    business_description: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None


class BuyerUpdate(BaseModel):
    buyer_type: Optional[BuyerType] = None
    company_name: Optional[str] = None
    business_description: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None


class BuyerOut(BaseModel):
    buyer_id: uuid.UUID
    user_id: uuid.UUID
    buyer_type: BuyerType
    company_name: Optional[str] = None
    business_description: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    profile_image: Optional[str] = None

    model_config = {"from_attributes": True}
