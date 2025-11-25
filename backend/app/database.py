"""
Database Configuration and Connection Management
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import StaticPool
from config import settings
import os

# Create base class for models
Base = declarative_base()

# Async engine
if settings.DATABASE_URL.startswith("sqlite"):
    # For SQLite, use StaticPool for async support
    engine = create_async_engine(
        settings.DATABASE_URL.replace("sqlite://", "sqlite+aiosqlite:///"),
        echo=settings.SQLALCHEMY_ECHO,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
else:
    # For PostgreSQL
    engine = create_async_engine(
        settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"),
        echo=settings.SQLALCHEMY_ECHO,
        pool_size=20,
        max_overflow=0,
    )

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_db_session() -> AsyncSession:
    """Dependency for getting database session"""
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def close_db():
    """Close database connection"""
    await engine.dispose()
