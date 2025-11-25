"""
Main FastAPI Application
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from config import settings
from app.database import init_db, close_db, get_db_session
from app.websocket_manager import manager
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up...")
    await init_db()
    logger.info("Database initialized")
    yield
    # Shutdown
    logger.info("Shutting down...")
    await close_db()
    logger.info("Database closed")

# Create FastAPI app
app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description=settings.API_DESCRIPTION,
    lifespan=lifespan,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# Add trusted host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*.localhost"],
)

# ============ Health Check ============

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.API_VERSION,
        "active_connections": manager.get_connection_count()
    }

# ============ API Routes ============

# Import routes
from app.routes.auth import router as auth_router
from app.routes.machines import router as machines_router
from app.routes.waitlist import router as waitlist_router
from app.routes.faults import router as faults_router
from app.routes.activities import activities_router, profile_router, notifications_router

# Include routes
app.include_router(auth_router)
app.include_router(machines_router)
app.include_router(waitlist_router)
app.include_router(faults_router)
app.include_router(activities_router)
app.include_router(profile_router)
app.include_router(notifications_router)

# ============ WebSocket ============

@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    user_id = None
    try:
        # Accept connection
        await manager.connect(websocket)
        
        # First message should contain user_id (for authentication)
        initial_message = await websocket.receive_json()
        user_id = initial_message.get("user_id")
        
        if user_id:
            # Re-register with user_id for targeted messages
            await manager.connect(websocket, user_id)
            logger.info(f"User {user_id} connected to WebSocket")
        
        # Keep connection alive and handle incoming messages
        while True:
            try:
                data = await websocket.receive_json()
                # Handle any incoming messages if needed
                logger.debug(f"WebSocket message received: {data}")
            except Exception as e:
                logger.error(f"Error receiving message: {e}")
                break
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        if user_id:
            logger.info(f"User {user_id} disconnected from WebSocket")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, user_id)

# ============ Exception Handlers ============

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "status_code": exc.status_code
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "status_code": 500
        }
    )

# ============ Root ============

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "KY Wash API",
        "version": settings.API_VERSION,
        "docs": "/api/docs"
    }

# ============ API Info ============

@app.get("/api")
async def api_info():
    """API information endpoint"""
    return {
        "name": settings.API_TITLE,
        "version": settings.API_VERSION,
        "description": settings.API_DESCRIPTION,
        "endpoints": {
            "health": "/api/health",
            "docs": "/api/docs",
            "auth": "/api/v1/auth/*",
            "machines": "/api/v1/machines/*",
            "waitlist": "/api/v1/waitlist/*",
            "faults": "/api/v1/faults/*",
            "activities": "/api/v1/activities/*",
            "profile": "/api/v1/profile/*",
            "websocket": "ws://*/api/ws"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.SERVER_HOST,
        port=settings.SERVER_PORT,
        reload=settings.DEBUG
    )
