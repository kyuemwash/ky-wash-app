"""
Machine Management Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from app.database import get_db_session
from app.models import Machine, User, FaultReport, Activity, MachineType, MachineStatus, CycleCategory, ActivityType
from app.schemas import (
    MachineResponse, MachineListResponse, StartMachineRequest, 
    StartMachineResponse, CancelMachineRequest, EndCycleRequest,
    MachineReportCountResponse
)
from app.security import verify_token
from app.websocket_manager import manager
from config import settings
from app.security import get_cycle_time_seconds
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/machines", tags=["machines"])

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
        
        # Get user from database
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

@router.get("/", response_model=MachineListResponse)
async def get_machines(db: AsyncSession = Depends(get_db_session)):
    """Get all machines organized by type"""
    try:
        # Get all machines
        result = await db.execute(
            select(Machine).order_by(Machine.machine_type, Machine.machine_id)
        )
        machines = result.scalars().all()
        
        # Separate by type
        washers = [m for m in machines if m.machine_type == MachineType.WASHER]
        dryers = [m for m in machines if m.machine_type == MachineType.DRYER]
        
        # Initialize missing machines (1-6 per type)
        async def ensure_machines(machine_type: MachineType, existing: list):
            for i in range(1, settings.MACHINES_PER_TYPE + 1):
                if not any(m.machine_id == i for m in existing):
                    new_machine = Machine(
                        machine_id=i,
                        machine_type=machine_type,
                        status=MachineStatus.AVAILABLE
                    )
                    db.add(new_machine)
                    existing.append(new_machine)
            return existing
        
        washers = await ensure_machines(MachineType.WASHER, washers)
        dryers = await ensure_machines(MachineType.DRYER, dryers)
        
        if washers or dryers:
            await db.commit()
        
        # Convert to response
        return MachineListResponse(
            washers=[MachineResponse.model_validate(m) for m in washers],
            dryers=[MachineResponse.model_validate(m) for m in dryers]
        )
    
    except Exception as e:
        logger.error(f"Error getting machines: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get machines"
        )

@router.get("/{machine_type}/{machine_id}", response_model=MachineResponse)
async def get_machine(
    machine_type: str,
    machine_id: int,
    db: AsyncSession = Depends(get_db_session)
):
    """Get specific machine"""
    try:
        if machine_type.lower() not in ["washer", "dryer"]:
            raise HTTPException(status_code=400, detail="Invalid machine type")
        
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
        
        return MachineResponse.model_validate(machine)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting machine: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get machine"
        )

@router.post("/start", response_model=StartMachineResponse)
async def start_machine(
    request: StartMachineRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """Start a machine"""
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
        
        if machine.status != MachineStatus.AVAILABLE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Machine is {machine.status}"
            )
        
        if not machine.enabled:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Machine is disabled"
            )
        
        # Get cycle time
        cycle_time = get_cycle_time_seconds(request.category)
        
        # Update machine
        machine.status = MachineStatus.IN_USE
        machine.current_category = request.category
        machine.time_left_seconds = cycle_time
        machine.current_user_id = current_user.id
        machine.total_cycles += 1
        
        # Log activity
        activity = Activity(
            user_id=current_user.id,
            activity_type=ActivityType.MACHINE_STARTED,
            machine_type=request.machine_type,
            machine_id=request.machine_id,
            details=f"Started cycle: {request.category}"
        )
        
        db.add(activity)
        await db.commit()
        await db.refresh(machine)
        
        logger.info(f"Machine {request.machine_type} {request.machine_id} started by user {current_user.student_id}")
        
        # Broadcast update
        await manager.broadcast_machine_update({
            "machine_id": machine.machine_id,
            "machine_type": machine.machine_type,
            "status": machine.status,
            "time_left_seconds": machine.time_left_seconds,
            "current_user_id": machine.current_user_id
        })
        
        return StartMachineResponse(
            success=True,
            message="Machine started successfully",
            machine=MachineResponse.model_validate(machine),
            time_left_seconds=cycle_time
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting machine: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start machine"
        )

@router.post("/cancel")
async def cancel_machine(
    request: CancelMachineRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """Cancel a machine"""
    try:
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
        
        if machine.status != MachineStatus.IN_USE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel machine in {machine.status} state"
            )
        
        if machine.current_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not using this machine"
            )
        
        # Update machine
        machine.status = MachineStatus.AVAILABLE
        machine.current_category = None
        machine.time_left_seconds = 0
        machine.current_user_id = None
        
        # Log activity
        activity = Activity(
            user_id=current_user.id,
            activity_type=ActivityType.MACHINE_CANCELLED,
            machine_type=request.machine_type,
            machine_id=request.machine_id
        )
        
        db.add(activity)
        await db.commit()
        
        logger.info(f"Machine {request.machine_type} {request.machine_id} cancelled by user {current_user.student_id}")
        
        # Broadcast update
        await manager.broadcast_machine_update({
            "machine_id": machine.machine_id,
            "machine_type": machine.machine_type,
            "status": machine.status,
            "time_left_seconds": 0,
            "current_user_id": None
        })
        
        return {
            "success": True,
            "message": "Machine cancelled successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling machine: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel machine"
        )

@router.post("/end")
async def end_cycle(
    request: EndCycleRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """End a machine cycle"""
    try:
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
        
        if machine.status != MachineStatus.IN_USE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot end cycle for machine in {machine.status} state"
            )
        
        # Update machine
        machine.status = MachineStatus.COMPLETED
        
        # Log activity
        activity = Activity(
            user_id=current_user.id,
            activity_type=ActivityType.MACHINE_COMPLETED,
            machine_type=request.machine_type,
            machine_id=request.machine_id,
            details=f"Cycle completed: {machine.current_category}"
        )
        
        db.add(activity)
        await db.commit()
        
        logger.info(f"Machine {request.machine_type} {request.machine_id} cycle completed")
        
        # Broadcast update
        await manager.broadcast_machine_update({
            "machine_id": machine.machine_id,
            "machine_type": machine.machine_type,
            "status": machine.status,
            "time_left_seconds": 0,
            "current_user_id": None
        })
        
        return {
            "success": True,
            "message": "Cycle ended successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ending cycle: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to end cycle"
        )
