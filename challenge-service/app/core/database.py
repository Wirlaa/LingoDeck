from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.core.config import get_settings
settings = get_settings()
engine = create_async_engine(settings.DATABASE_URL, echo=settings.DATABASE_ECHO, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False, autoflush=False)
async def get_db():
    async with AsyncSessionLocal() as session:
        async with session.begin():
            yield session
