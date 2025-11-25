"""
Authentication Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from app.database import get_db_session
from app.models import User
from app.schemas import (
    UserRegisterRequest, UserLoginRequest, TokenResponse, 
    UserResponse, RefreshTokenRequest
)
from app.security import hash_password, verify_password, create_access_token, create_refresh_token, verify_token
from config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

@router.post("/register", response_model=TokenResponse)
async def register(
    request: UserRegisterRequest,
    db: AsyncSession = Depends(get_db_session)
):
    """Register a new user"""
    try:
        # Check if user already exists
        result = await db.execute(
            select(User).where(User.student_id == request.student_id)
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student ID already registered"
            )
        
        # Create new user
        hashed_pin = hash_password(request.pin)
        new_user = User(
            student_id=request.student_id,
            pin_hash=hashed_pin,
            phone_number=request.phone_number
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        logger.info(f"User registered: {request.student_id}")
        
        # Create tokens
        access_token = create_access_token(
            {"sub": str(new_user.id), "student_id": new_user.student_id}
        )
        refresh_token = create_refresh_token(
            {"sub": str(new_user.id), "student_id": new_user.student_id}
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(new_user),
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.post("/login", response_model=TokenResponse)
async def login(
    request: UserLoginRequest,
    db: AsyncSession = Depends(get_db_session)
):
    """Login user"""
    try:
        # Find user
        result = await db.execute(
            select(User).where(User.student_id == request.student_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Verify PIN
        if not verify_password(request.pin, user.pin_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        logger.info(f"User logged in: {request.student_id}")
        
        # Create tokens
        access_token = create_access_token(
            {"sub": str(user.id), "student_id": user.student_id}
        )
        refresh_token = create_refresh_token(
            {"sub": str(user.id), "student_id": user.student_id}
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(user),
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db_session)
):
    """Refresh access token"""
    try:
        # Verify refresh token
        payload = verify_token(request.refresh_token)
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Get user
        result = await db.execute(
            select(User).where(User.id == int(user_id))
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Create new access token
        access_token = create_access_token(
            {"sub": str(user.id), "student_id": user.student_id}
        )
        
        return {
            "access_token": access_token,
            "refresh_token": request.refresh_token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(user),
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

@router.post("/logout")
async def logout():
    """Logout user (client-side token cleanup)"""
    return {
        "message": "Logged out successfully"
    }
