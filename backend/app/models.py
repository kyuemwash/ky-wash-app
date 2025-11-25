"""
SQLAlchemy Models for KY Wash Backend
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, Float, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
from datetime import datetime
import enum

class MachineType(str, enum.Enum):
    WASHER = "washer"
    DRYER = "dryer"

class MachineStatus(str, enum.Enum):
    AVAILABLE = "available"
    IN_USE = "in_use"
    COMPLETED = "completed"
    DISABLED = "disabled"

class CycleCategory(str, enum.Enum):
    NORMAL = "normal"
    EXTRA_5 = "extra_5"
    EXTRA_10 = "extra_10"
    EXTRA_15 = "extra_15"

class ActivityType(str, enum.Enum):
    MACHINE_STARTED = "machine_started"
    MACHINE_CANCELLED = "machine_cancelled"
    MACHINE_COMPLETED = "machine_completed"
    JOINED_WAITLIST = "joined_waitlist"
    LEFT_WAITLIST = "left_waitlist"
    FAULT_REPORTED = "fault_reported"
    MACHINE_DISABLED = "machine_disabled"
    PROFILE_UPDATED = "profile_updated"
    USER_REGISTERED = "user_registered"

class NotificationType(str, enum.Enum):
    CYCLE_COMPLETE = "cycle_complete"
    JOINED_WAITLIST = "joined_waitlist"
    REMOVED_FROM_WAITLIST = "removed_from_waitlist"
    MACHINE_AVAILABLE = "machine_available"
    FAULT_REPORTED = "fault_reported"
    SYSTEM_ALERT = "system_alert"

# Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(6), unique=True, index=True, nullable=False)
    pin_hash = Column(String(255), nullable=False)
    phone_number = Column(String(15), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    current_machine = relationship("Machine", back_populates="current_user", foreign_keys="Machine.current_user_id")
    waitlist_items = relationship("WaitlistItem", back_populates="user", cascade="all, delete-orphan")
    fault_reports = relationship("FaultReport", back_populates="user", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")

class Machine(Base):
    __tablename__ = "machines"
    
    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, nullable=False)  # 1-6
    machine_type = Column(Enum(MachineType), nullable=False)
    status = Column(Enum(MachineStatus), default=MachineStatus.AVAILABLE, nullable=False)
    current_category = Column(Enum(CycleCategory), nullable=True)
    time_left_seconds = Column(Integer, default=0)
    current_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    enabled = Column(Boolean, default=True)
    total_cycles = Column(Integer, default=0)
    last_maintenance = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    current_user = relationship("User", back_populates="current_machine", foreign_keys=[current_user_id])
    fault_reports = relationship("FaultReport", back_populates="machine", cascade="all, delete-orphan")
    
    __table_args__ = (
        # Unique constraint on machine_id and machine_type combination
        # which gives us a unique identifier per physical machine
    )

class WaitlistItem(Base):
    __tablename__ = "waitlist_items"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    machine_type = Column(Enum(MachineType), nullable=False, index=True)
    position = Column(Integer, nullable=False)  # Position in queue
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="waitlist_items")

class FaultReport(Base):
    __tablename__ = "fault_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    description = Column(Text, nullable=False)
    photo_data = Column(Text, nullable=True)  # Base64 encoded photo
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    machine = relationship("Machine", back_populates="fault_reports")
    user = relationship("User", back_populates="fault_reports")

class Activity(Base):
    __tablename__ = "activities"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    activity_type = Column(Enum(ActivityType), nullable=False)
    machine_type = Column(Enum(MachineType), nullable=True)
    machine_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="activities")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    notification_type = Column(Enum(NotificationType), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    machine_type = Column(Enum(MachineType), nullable=True)
    machine_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="notifications")

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    refresh_token = Column(String(500), nullable=False, unique=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="sessions")
