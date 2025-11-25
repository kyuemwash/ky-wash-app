"""
Pydantic Schemas for Request/Response Validation
"""
from pydantic import BaseModel, Field, validator, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum

# Enums for validation
class MachineTypeSchema(str, Enum):
    WASHER = "washer"
    DRYER = "dryer"

class MachineStatusSchema(str, Enum):
    AVAILABLE = "available"
    IN_USE = "in_use"
    COMPLETED = "completed"
    DISABLED = "disabled"

class CycleCategorySchema(str, Enum):
    NORMAL = "normal"
    EXTRA_5 = "extra_5"
    EXTRA_10 = "extra_10"
    EXTRA_15 = "extra_15"

# ============ Authentication Schemas ============

class UserRegisterRequest(BaseModel):
    student_id: str = Field(..., min_length=6, max_length=6, pattern="^[0-9]{6}$")
    pin: str = Field(..., min_length=4, max_length=4, pattern="^[0-9]{4}$")
    phone_number: str = Field(..., min_length=10, max_length=15)
    
    @validator("phone_number")
    def validate_phone(cls, v):
        # Remove common phone formatting characters
        cleaned = "".join(c for c in v if c.isdigit())
        if len(cleaned) not in [10, 11]:
            raise ValueError("Phone number must be 10 or 11 digits")
        return v

class UserLoginRequest(BaseModel):
    student_id: str = Field(..., min_length=6, max_length=6, pattern="^[0-9]{6}$")
    pin: str = Field(..., min_length=4, max_length=4, pattern="^[0-9]{4}$")

class UserResponse(BaseModel):
    id: int
    student_id: str
    phone_number: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse
    expires_in: int

class RefreshTokenRequest(BaseModel):
    refresh_token: str

# ============ Machine Schemas ============

class MachineResponse(BaseModel):
    id: int
    machine_id: int
    machine_type: MachineTypeSchema
    status: MachineStatusSchema
    current_category: Optional[CycleCategorySchema]
    time_left_seconds: int
    current_user_id: Optional[int]
    enabled: bool
    total_cycles: int
    last_maintenance: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class MachineListResponse(BaseModel):
    washers: List[MachineResponse]
    dryers: List[MachineResponse]

class StartMachineRequest(BaseModel):
    machine_id: int = Field(..., ge=1, le=6)
    machine_type: MachineTypeSchema
    category: CycleCategorySchema

class StartMachineResponse(BaseModel):
    success: bool
    message: str
    machine: Optional[MachineResponse]
    time_left_seconds: Optional[int]

class CancelMachineRequest(BaseModel):
    machine_id: int = Field(..., ge=1, le=6)
    machine_type: MachineTypeSchema

class EndCycleRequest(BaseModel):
    machine_id: int = Field(..., ge=1, le=6)
    machine_type: MachineTypeSchema

# ============ Waitlist Schemas ============

class WaitlistItemResponse(BaseModel):
    id: int
    user_id: int
    student_id: str
    machine_type: MachineTypeSchema
    position: int
    joined_at: datetime
    
    class Config:
        from_attributes = True

class WaitlistResponse(BaseModel):
    machine_type: MachineTypeSchema
    items: List[WaitlistItemResponse]
    count: int

class JoinWaitlistRequest(BaseModel):
    machine_type: MachineTypeSchema

class LeaveWaitlistRequest(BaseModel):
    machine_type: MachineTypeSchema

# ============ Fault Report Schemas ============

class ReportFaultRequest(BaseModel):
    machine_id: int = Field(..., ge=1, le=6)
    machine_type: MachineTypeSchema
    description: str = Field(..., min_length=5, max_length=500)
    photo_data: Optional[str] = None  # Base64 encoded

class FaultReportResponse(BaseModel):
    id: int
    machine_id: int
    user_id: int
    description: str
    photo_data: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class MachineReportCountResponse(BaseModel):
    machine_id: int
    machine_type: MachineTypeSchema
    report_count: int
    is_disabled: bool

# ============ Activity Schemas ============

class ActivityResponse(BaseModel):
    id: int
    user_id: int
    activity_type: str
    machine_type: Optional[MachineTypeSchema]
    machine_id: Optional[int]
    details: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class ActivityFeedResponse(BaseModel):
    activities: List[ActivityResponse]
    total: int

# ============ Notification Schemas ============

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    notification_type: str
    title: str
    message: str
    is_read: bool
    machine_type: Optional[MachineTypeSchema]
    machine_id: Optional[int]
    created_at: datetime
    
    class Config:
        from_attributes = True

class NotificationsResponse(BaseModel):
    notifications: List[NotificationResponse]
    unread_count: int

class MarkNotificationAsReadRequest(BaseModel):
    notification_id: int

# ============ Profile Schemas ============

class UpdateProfileRequest(BaseModel):
    phone_number: str = Field(..., min_length=10, max_length=15)
    
    @validator("phone_number")
    def validate_phone(cls, v):
        cleaned = "".join(c for c in v if c.isdigit())
        if len(cleaned) not in [10, 11]:
            raise ValueError("Phone number must be 10 or 11 digits")
        return v

class UpdateProfileResponse(BaseModel):
    success: bool
    message: str
    user: Optional[UserResponse]

# ============ Error Schemas ============

class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None
    status_code: int

# ============ Health Check ============

class HealthCheckResponse(BaseModel):
    status: str
    version: str
    database: str = "connected"
