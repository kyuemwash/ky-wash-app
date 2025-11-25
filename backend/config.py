"""
KY Wash Backend - Configuration Module
"""
from pydantic import BaseModel, Field
from typing import Optional, List
import os

class Settings(BaseModel):
    # API Configuration
    API_TITLE: str = "KY Wash API"
    API_VERSION: str = "1.0.0"
    API_DESCRIPTION: str = "Real-time laundry management system backend"
    
    # Server
    SERVER_HOST: str = "0.0.0.0"
    SERVER_PORT: int = 8000
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./kywash.db")
    SQLALCHEMY_ECHO: bool = False
    
    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production-12345678")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000", "http://127.0.0.1:3000"]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]
    
    # WebSocket
    WEBSOCKET_HEARTBEAT_INTERVAL: int = 30  # seconds
    MAX_ACTIVE_CONNECTIONS: int = 100
    
    # Business Logic
    MACHINES_PER_TYPE: int = 6  # 6 washers + 6 dryers
    FAULT_REPORT_DISABLE_THRESHOLD: int = 3
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
