from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
import asyncio
from app.core.config import settings


engine = create_async_engine(settings.DATABASE_URL, echo=True, pool_pre_ping=True)

async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


# Lightweight migrations: adds new nullable columns to existing tables (create_all won't do it).
_MIGRATIONS = [
    ("users", [
        ("cpf", "VARCHAR(14)"),
        ("department", "VARCHAR(100)"),
        ("position", "VARCHAR(100)"),
        ("hire_date", "DATE"),
        ("work_hours_per_day", "NUMERIC(5, 2) DEFAULT 8.0"),
        ("hourly_rate", "NUMERIC(10, 2)"),
    ]),
    ("time_entries", [
        ("approval_status", "VARCHAR(15) DEFAULT 'PENDING'"),
        ("approved_by", "INTEGER"),
        ("approved_at", "TIMESTAMP"),
    ]),
]


async def _run_migrations():
    is_sqlite = settings.DATABASE_URL.startswith("sqlite")
    if is_sqlite:
        async with engine.connect() as conn:
            for table, columns in _MIGRATIONS:
                existing = set()
                res = await conn.execute(text(f"SELECT name FROM pragma_table_info('{table}')"))
                for row in res:
                    existing.add(str(row[0]))
                for col, coltype in columns:
                    if col not in existing:
                        await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {coltype}"))
            await conn.execute(text("UPDATE time_entries SET approval_status = 'PENDING' WHERE approval_status = 'pending'"))
    else:
        async with engine.connect() as conn:
            for table, columns in _MIGRATIONS:
                for col, coltype in columns:
                    await conn.execute(text(
                        f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {coltype}"
                    ))


async def init_db():
    if not settings.DATABASE_URL.startswith("sqlite"):
        # Recria os enums com rótulos do VALOR (minúsculo, ex 'pending') em vez
        # do nome ('PENDING'), compatível com as inserções do seed/app. O banco
        # de produção é sem dados relevantes, então o recreate é seguro.
        async with engine.begin() as conn:
            await conn.execute(text("DROP TYPE IF EXISTS userrole CASCADE"))
            await conn.execute(text("DROP TYPE IF EXISTS timeentrystatus CASCADE"))
            await conn.execute(text("DROP TYPE IF EXISTS approvalstatus CASCADE"))
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _run_migrations()