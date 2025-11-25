"""
Fault Reporting Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from app.database import get_db_session
from app.models import FaultReport, Machine, User, MachineStatus, Activity, ActivityType, MachineType
from app.schemas import ReportFaultRequest, FaultReportResponse, MachineReportCountResponse
from app.security import verify_token
from app.websocket_manager import manager
from config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/faults", tags=["faults"])

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

@router.post("/report", response_model=FaultReportResponse)
async def report_fault(
    request: ReportFaultRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """Report a fault on a machine"""
    try:
        # Get machine
        result = await db.execute(
            select(Machine).where(
                and_(
                    Machine.machine_type == request.machine_type,
                    Machine.machine_id == request.machine_id
                )
            )
        )
        machine = result.scalar_one_or_none()
        
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found")
        
        # Create fault report
        fault_report = FaultReport(
            machine_id=machine.id,
            user_id=current_user.id,
            description=request.description,
            photo_data=request.photo_data
        )
        
        db.add(fault_report)
        await db.flush()  # Flush to get the ID
        
        # Count reports for this machine
        result = await db.execute(
            select(func.count(FaultReport.id)).where(
                FaultReport.machine_id == machine.id
            )
        )
        report_count = result.scalar()
        
        # Check if threshold reached
        if report_count >= settings.FAULT_REPORT_DISABLE_THRESHOLD:
            machine.status = MachineStatus.DISABLED
            machine.enabled = False
            logger.warning(f"Machine {request.machine_type} {request.machine_id} disabled after {report_count} reports")
        
        # Log activity
        activity = Activity(
            user_id=current_user.id,
            activity_type=ActivityType.FAULT_REPORTED,
            machine_type=request.machine_type,
            machine_id=request.machine_id,
            details=request.description
        )
        
        db.add(activity)
        await db.commit()
        await db.refresh(fault_report)
        
        logger.info(f"Fault reported for {request.machine_type} {request.machine_id} by user {current_user.student_id}")
        
        # Broadcast update
        await manager.broadcast_fault_report({
            "machine_id": machine.machine_id,
            "machine_type": request.machine_type,
            "report_count": report_count,
            "is_disabled": machine.status == MachineStatus.DISABLED,
            "description": request.description
        })
        
        return FaultReportResponse.model_validate(fault_report)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reporting fault: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to report fault"
        )

@router.get("/{machine_type}/{machine_id}", response_model=MachineReportCountResponse)
async def get_machine_report_count(
    machine_type: str,
    machine_id: int,
    db: AsyncSession = Depends(get_db_session)
):
    """Get fault report count for a machine"""
    try:
        if machine_type.lower() not in ["washer", "dryer"]:
            raise HTTPException(status_code=400, detail="Invalid machine type")
        
        # Get machine
        result = await db.execute(
            select(Machine).where(
                and_(
                    Machine.machine_type == machine_type.lower(),
                    Machine.machine_id == machine_id
                )
            )
        )
        machine = result.scalar_one_or_none()
        
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found")
        
        # Count reports
        result = await db.execute(
            select(func.count(FaultReport.id)).where(
                FaultReport.machine_id == machine.id
            )
        )
        report_count = result.scalar()
        
        return MachineReportCountResponse(
            machine_id=machine_id,
            machine_type=machine_type.lower(),
            report_count=report_count,
            is_disabled=machine.status == MachineStatus.DISABLED
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting report count: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get report count"
        )

@router.get("/")
async def get_all_reports(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """Get all fault reports (admin only for now)"""
    try:
        result = await db.execute(
            select(FaultReport).order_by(FaultReport.created_at.desc())
        )
        reports = result.scalars().all()
        
        return [FaultReportResponse.model_validate(r) for r in reports]
    
    except Exception as e:
        logger.error(f"Error getting reports: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get reports"
        )
