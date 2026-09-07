"""
BaazarSetu — Enquiries API (B2B Bulk Requests)
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc

from app.core.database import get_db
from app.models.enquiry import Enquiry, EnquiryStatus
from app.models.notification import Notification, NotificationType
from app.models.artisan import Artisan
from app.models.buyer import Buyer
from app.models.user import User
from app.utils.dependencies import get_current_user
from app.utils.response import success_response, error_response, paginate
from app.schemas.schemas import EnquiryCreate, EnquiryUpdate, EnquiryOut
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/enquiries", tags=["Enquiries"])


@router.post("", response_model=dict, status_code=201)
async def create_enquiry(
    body: EnquiryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Buyer creates a bulk enquiry/B2B request to an artisan.
    Only buyers can create enquiries.
    """
    # Must be a buyer
    buyer_result = await db.execute(
        select(Buyer).where(Buyer.user_id == current_user.user_id)
    )
    buyer = buyer_result.scalar_one_or_none()
    if not buyer:
        raise HTTPException(
            status_code=403,
            detail=error_response("FORBIDDEN", "Only buyers can create enquiries"),
        )

    # Verify seller exists
    seller_result = await db.execute(
        select(Artisan).where(Artisan.artisan_id == body.seller_id)
    )
    if not seller_result.scalar_one_or_none():
        raise HTTPException(
            status_code=404, detail=error_response("NOT_FOUND", "Seller not found")
        )

    enquiry = Enquiry(
        buyer_id=buyer.buyer_id,
        seller_id=body.seller_id,
        product_id=body.product_id,
        required_quantity=body.required_quantity,
        proposed_price=body.proposed_price,
        budget=body.budget,
        delivery_date=body.delivery_date,
        message=body.message,
        status=EnquiryStatus.pending,
    )
    db.add(enquiry)

    # Notify seller
    artisan = seller_result.scalar_one_or_none()
    if artisan:
        notif = Notification(
            user_id=artisan.user_id,
            title="New Enquiry",
            message=f"You have a new bulk enquiry for {body.required_quantity} units.",
            notification_type=NotificationType.enquiry,
        )
        db.add(notif)

    await db.commit()
    await db.refresh(enquiry)

    return success_response(
        data=EnquiryOut.model_validate(enquiry).model_dump(),
        message="Enquiry submitted successfully",
    )


@router.get("", response_model=dict, status_code=200)
async def list_enquiries(
    status: Optional[EnquiryStatus] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List enquiries for the current user.
    Buyers see their sent enquiries; artisans see received enquiries.
    """
    from app.models.user import UserRole

    conditions = []
    if current_user.role == UserRole.buyer:
        buyer_r = await db.execute(select(Buyer).where(Buyer.user_id == current_user.user_id))
        buyer = buyer_r.scalar_one_or_none()
        if not buyer:
            raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Buyer profile not found"))
        conditions.append(Enquiry.buyer_id == buyer.buyer_id)
    else:
        artisan_r = await db.execute(select(Artisan).where(Artisan.user_id == current_user.user_id))
        artisan = artisan_r.scalar_one_or_none()
        if not artisan:
            raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Artisan profile not found"))
        conditions.append(Enquiry.seller_id == artisan.artisan_id)

    if status:
        conditions.append(Enquiry.status == status)

    from sqlalchemy import and_
    count_result = await db.execute(
        select(func.count()).where(and_(*conditions))
    )
    total = count_result.scalar()

    result = await db.execute(
        select(Enquiry).where(and_(*conditions))
        .order_by(desc(Enquiry.created_at))
        .offset((page - 1) * page_size).limit(page_size)
    )
    enquiries = result.scalars().all()

    return paginate(
        items=[EnquiryOut.model_validate(e).model_dump() for e in enquiries],
        page=page, page_size=page_size, total=total,
    )


@router.get("/{enquiry_id}", response_model=dict, status_code=200)
async def get_enquiry(
    enquiry_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single enquiry. Only buyer and seller can view."""
    result = await db.execute(select(Enquiry).where(Enquiry.enquiry_id == enquiry_id))
    enquiry = result.scalar_one_or_none()
    if not enquiry:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Enquiry not found"))

    await _authorize_enquiry_access(db, current_user, enquiry)
    return success_response(data=EnquiryOut.model_validate(enquiry).model_dump())


@router.patch("/{enquiry_id}", response_model=dict, status_code=200)
async def update_enquiry(
    enquiry_id: uuid.UUID,
    body: EnquiryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Artisan responds to enquiry: accept, reject, or counter-offer.
    Buyer can cancel their own enquiry.
    """
    result = await db.execute(select(Enquiry).where(Enquiry.enquiry_id == enquiry_id))
    enquiry = result.scalar_one_or_none()
    if not enquiry:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Enquiry not found"))

    await _authorize_enquiry_access(db, current_user, enquiry)

    # Status transition rules
    from app.models.user import UserRole
    if current_user.role == UserRole.artisan:
        allowed = {EnquiryStatus.accepted, EnquiryStatus.rejected, EnquiryStatus.counter_offer}
        if body.status not in allowed:
            raise HTTPException(
                status_code=400,
                detail=error_response("INVALID_STATUS", "Artisans can only accept, reject, or counter-offer"),
            )
    elif current_user.role == UserRole.buyer:
        if body.status != EnquiryStatus.cancelled:
            raise HTTPException(
                status_code=400,
                detail=error_response("INVALID_STATUS", "Buyers can only cancel enquiries"),
            )

    enquiry.status = body.status
    if body.counter_offer_price is not None:
        enquiry.counter_offer_price = body.counter_offer_price
    if body.counter_offer_message is not None:
        enquiry.counter_offer_message = body.counter_offer_message

    await db.commit()
    await db.refresh(enquiry)
    return success_response(
        data=EnquiryOut.model_validate(enquiry).model_dump(),
        message="Enquiry updated successfully",
    )


async def _authorize_enquiry_access(db: AsyncSession, user: User, enquiry: Enquiry) -> None:
    """Ensure user is buyer or seller of this enquiry."""
    from app.models.user import UserRole

    if user.role == UserRole.buyer:
        buyer_r = await db.execute(select(Buyer).where(Buyer.user_id == user.user_id))
        buyer = buyer_r.scalar_one_or_none()
        if not buyer or buyer.buyer_id != enquiry.buyer_id:
            raise HTTPException(status_code=403, detail=error_response("FORBIDDEN", "Not your enquiry"))
    else:
        artisan_r = await db.execute(select(Artisan).where(Artisan.user_id == user.user_id))
        artisan = artisan_r.scalar_one_or_none()
        if not artisan or artisan.artisan_id != enquiry.seller_id:
            raise HTTPException(status_code=403, detail=error_response("FORBIDDEN", "Not your enquiry"))
