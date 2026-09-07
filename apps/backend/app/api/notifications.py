"""
BaazarSetu — Notification API
"""
import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.core.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.utils.dependencies import get_current_user
from app.utils.response import success_response, paginate

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=dict)
async def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List notifications for the current user."""
    conditions = [Notification.user_id == current_user.user_id]
    if unread_only:
        conditions.append(Notification.is_read == False)

    from sqlalchemy import and_
    count_r = await db.execute(select(func.count()).where(and_(*conditions)))
    total = count_r.scalar()

    result = await db.execute(
        select(Notification).where(and_(*conditions))
        .order_by(desc(Notification.created_at))
        .offset((page - 1) * page_size).limit(page_size)
    )
    notifications = result.scalars().all()

    return paginate(
        items=[
            {
                "notification_id": str(n.notification_id),
                "title": n.title,
                "message": n.message,
                "notification_type": n.notification_type,
                "is_read": n.is_read,
                "reference_id": n.reference_id,
                "created_at": n.created_at.isoformat(),
            }
            for n in notifications
        ],
        page=page, page_size=page_size, total=total,
    )


@router.patch("/{notification_id}/read", response_model=dict)
async def mark_read(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a notification as read."""
    result = await db.execute(
        select(Notification).where(
            Notification.notification_id == notification_id,
            Notification.user_id == current_user.user_id,
        )
    )
    notif = result.scalar_one_or_none()
    if notif:
        notif.is_read = True
        await db.commit()
    return success_response(message="Notification marked as read")


@router.patch("/read-all", response_model=dict)
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read."""
    from sqlalchemy import update
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.user_id, Notification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
    return success_response(message="All notifications marked as read")
