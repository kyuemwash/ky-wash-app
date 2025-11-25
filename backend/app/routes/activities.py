"""
User Activities and Profile Management Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.database import get_db_session
from app.models import User, Activity, Notification
from app.schemas import (
    UserResponse, UpdateProfileRequest, UpdateProfileResponse,
    ActivityFeedResponse, ActivityResponse, NotificationsResponse,
    NotificationResponse
)
from app.security import verify_token
from app.websocket_manager import manager
import logging

logger = logging.getLogger(__name__)

# Create routers
activities_router = APIRouter(prefix="/api/v1/activities", tags=["activities"])
profile_router = APIRouter(prefix="/api/v1/profile", tags=["profile"])
notifications_router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])

# ============ Dependency for current user ============

async def get_current_user(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db_session)
):
    """Get current user from JWT token"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError("Invalid scheme")
        
        payload = verify_token(token)
        user_id = payload.get("sub")
        
        if not user_id:
            raise ValueError("Invalid token")
        
        result = await db.execute(
            select(User).where(User.id == int(user_id))
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError("User not found")
        
        return user
    
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

# ============ Profile Endpoints ============

@profile_router.get("/me", response_model=UserResponse)
async def get_profile(
    current_user: User = Depends(get_current_user)
):
    """Get current user profile"""
    try:
        return UserResponse.model_validate(current_user)
    except Exception as e:
        logger.error(f"Error getting profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get profile"
        )

@profile_router.put("/update", response_model=UpdateProfileResponse)
async def update_profile(
    request: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """Update user profile"""
    try:
        # Update phone number
        current_user.phone_number = request.phone_number
        
        db.add(current_user)
        await db.commit()
        await db.refresh(current_user)
        
        logger.info(f"Profile updated for user {current_user.student_id}")
        
        return UpdateProfileResponse(
            success=True,
            message="Profile updated successfully",
            user=UserResponse.model_validate(current_user)
        )
    
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )

# ============ Activity Endpoints ============

@activities_router.get("/", response_model=ActivityFeedResponse)
async def get_activities(
    db: AsyncSession = Depends(get_db_session),
    limit: int = 50,
    offset: int = 0
):
    """Get activity feed"""
    try:
        # Get total count
        result = await db.execute(select(Activity))
        total = len(result.scalars().all())
        
        # Get paginated activities
        result = await db.execute(
            select(Activity)
            .order_by(desc(Activity.created_at))
            .offset(offset)
            .limit(limit)
        )
        activities = result.scalars().all()
        
        return ActivityFeedResponse(
            activities=[ActivityResponse.model_validate(a) for a in activities],
            total=total
        )
    
    except Exception as e:
        logger.error(f"Error getting activities: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get activities"
        )

@activities_router.get("/user/{user_id}", response_model=ActivityFeedResponse)
async def get_user_activities(
    user_id: int,
    db: AsyncSession = Depends(get_db_session),
    limit: int = 50,
    offset: int = 0
):
    """Get activities for specific user"""
    try:
        # Get total count
        result = await db.execute(
            select(Activity).where(Activity.user_id == user_id)
        )
        total = len(result.scalars().all())
        
        # Get paginated activities
        result = await db.execute(
            select(Activity)
            .where(Activity.user_id == user_id)
            .order_by(desc(Activity.created_at))
            .offset(offset)
            .limit(limit)
        )
        activities = result.scalars().all()
        
        return ActivityFeedResponse(
            activities=[ActivityResponse.model_validate(a) for a in activities],
            total=total
        )
    
    except Exception as e:
        logger.error(f"Error getting user activities: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user activities"
        )

# ============ Notification Endpoints ============

@notifications_router.get("/", response_model=NotificationsResponse)
async def get_notifications(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """Get user notifications"""
    try:
        result = await db.execute(
            select(Notification)
            .where(Notification.user_id == current_user.id)
            .order_by(desc(Notification.created_at))
        )
        notifications = result.scalars().all()
        
        # Count unread
        unread_count = sum(1 for n in notifications if not n.is_read)
        
        return NotificationsResponse(
            notifications=[NotificationResponse.model_validate(n) for n in notifications],
            unread_count=unread_count
        )
    
    except Exception as e:
        logger.error(f"Error getting notifications: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get notifications"
        )

@notifications_router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """Mark notification as read"""
    try:
        result = await db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == current_user.id
            )
        )
        notification = result.scalar_one_or_none()
        
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        notification.is_read = True
        db.add(notification)
        await db.commit()
        
        return {"success": True, "message": "Marked as read"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark as read"
        )

@notifications_router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """Delete a notification"""
    try:
        result = await db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == current_user.id
            )
        )
        notification = result.scalar_one_or_none()
        
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        await db.delete(notification)
        await db.commit()
        
        return {"success": True, "message": "Notification deleted"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting notification: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete notification"
        )
