"""
Waitlist Management Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func
from app.database import get_db_session
from app.models import WaitlistItem, User, MachineType, Activity, ActivityType
from app.schemas import (
    WaitlistResponse, WaitlistItemResponse, JoinWaitlistRequest,
    LeaveWaitlistRequest
)
from app.security import verify_token
from app.websocket_manager import manager
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/waitlist", tags=["waitlist"])

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

# ============ Endpoints ============

@router.get("/{machine_type}", response_model=WaitlistResponse)
async def get_waitlist(
    machine_type: str,
    db: AsyncSession = Depends(get_db_session)
):
    """Get waitlist for a machine type"""
    try:
        if machine_type.lower() not in ["washer", "dryer"]:
            raise HTTPException(status_code=400, detail="Invalid machine type")
        
        # Get waitlist items
        result = await db.execute(
            select(WaitlistItem, User).join(User).where(
                WaitlistItem.machine_type == machine_type.lower()
            ).order_by(WaitlistItem.position)
        )
        
        items = result.all()
        
        waitlist_items = [
            WaitlistItemResponse(
                id=item[0].id,
                user_id=item[1].id,
                student_id=item[1].student_id,
                machine_type=item[0].machine_type,
                position=item[0].position,
                joined_at=item[0].joined_at
            )
            for item in items
        ]
        
        return WaitlistResponse(
            machine_type=machine_type.lower(),
            items=waitlist_items,
            count=len(waitlist_items)
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting waitlist: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get waitlist"
        )

@router.post("/join", response_model=dict)
async def join_waitlist(
    request: JoinWaitlistRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """Join waitlist for a machine type"""
    try:
        machine_type_str = request.machine_type.value if hasattr(request.machine_type, 'value') else str(request.machine_type)
        
        # Check if already on waitlist
        result = await db.execute(
            select(WaitlistItem).where(
                and_(
                    WaitlistItem.user_id == current_user.id,
                    WaitlistItem.machine_type == machine_type_str
                )
            )
        )
        
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already on this waitlist"
            )
        
        # Get next position
        result = await db.execute(
            select(func.max(WaitlistItem.position)).where(
                WaitlistItem.machine_type == machine_type_str
            )
        )
        max_position = result.scalar() or 0
        next_position = max_position + 1
        
        # Add to waitlist
        waitlist_item = WaitlistItem(
            user_id=current_user.id,
            machine_type=machine_type_str,
            position=next_position
        )
        
        # Log activity
        activity = Activity(
            user_id=current_user.id,
            activity_type=ActivityType.JOINED_WAITLIST,
            machine_type=machine_type_str,
            details=f"Joined {machine_type_str} waitlist at position {next_position}"
        )
        
        db.add(waitlist_item)
        db.add(activity)
        await db.commit()
        
        logger.info(f"User {current_user.student_id} joined {machine_type_str} waitlist at position {next_position}")
        
        # Broadcast update
        await manager.broadcast_waitlist_update(
            machine_type_str,
            [{"position": next_position, "student_id": current_user.student_id}]
        )
        
        return {
            "success": True,
            "message": f"Joined {machine_type_str} waitlist",
            "position": next_position
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error joining waitlist: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to join waitlist"
        )

@router.post("/leave", response_model=dict)
async def leave_waitlist(
    request: LeaveWaitlistRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """Leave waitlist for a machine type"""
    try:
        machine_type_str = request.machine_type.value if hasattr(request.machine_type, 'value') else str(request.machine_type)
        
        # Find and remove from waitlist
        result = await db.execute(
            select(WaitlistItem).where(
                and_(
                    WaitlistItem.user_id == current_user.id,
                    WaitlistItem.machine_type == machine_type_str
                )
            )
        )
        
        waitlist_item = result.scalar_one_or_none()
        
        if not waitlist_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Not on this waitlist"
            )
        
        # Remove from waitlist
        await db.delete(waitlist_item)
        
        # Log activity
        activity = Activity(
            user_id=current_user.id,
            activity_type=ActivityType.LEFT_WAITLIST,
            machine_type=machine_type_str
        )
        
        db.add(activity)
        await db.commit()
        
        logger.info(f"User {current_user.student_id} left {machine_type_str} waitlist")
        
        # Broadcast update
        await manager.broadcast_waitlist_update(
            machine_type_str,
            [{"removed_user_id": current_user.id}]
        )
        
        return {
            "success": True,
            "message": f"Left {machine_type_str} waitlist"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error leaving waitlist: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to leave waitlist"
        )
