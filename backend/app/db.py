"""
数据库异步引导模块。

- 使用 SQLModel + aiosqlite 提供异步引擎，适配高并发请求。
- 通过 asynccontextmanager 暴露 get_session，便于 FastAPI 依赖注入。
- 预留 echo 开关与 pool_size，可按需在部署时调整。
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./database_V2.sqlite")

# 允许通过环境变量打开 SQL 回显或调整连接池大小
ENGINE_ECHO = os.getenv("DB_ECHO", "false").lower() == "true"
POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "5"))
MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "10"))

engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    echo=ENGINE_ECHO,
    future=True,
    pool_pre_ping=True,
    pool_size=POOL_SIZE,
    max_overflow=MAX_OVERFLOW,
)

async_session_factory = sessionmaker(
    engine, expire_on_commit=False, class_=AsyncSession
)


async def init_db() -> None:
    """初始化数据库表结构，适合在应用启动时调用。"""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


@asynccontextmanager
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    提供异步会话上下文管理器：
    ```python
    async with get_session() as session:
        ...
    ```
    """
    session: AsyncSession = async_session_factory()
    try:
        yield session
    finally:
        await session.close()
