"""
异步仓储层：将数据访问与业务逻辑解耦，便于后续维护与单元测试。

- 保持类型安全：所有查询都返回精确类型而非 Any。
- 约束友好：Upsert 进度时遵循唯一约束，避免重复行。
- 异步友好：所有方法都可在 FastAPI 的 async 路由中直接使用。
"""
from __future__ import annotations

from typing import List, Optional, Sequence

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlmodel.ext.asyncio.session import AsyncSession

from .models import Book, BookSettings, Progress, User


class UserRepository:
    """用户相关读写操作。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_username(self, username: str) -> Optional[User]:
        stmt = select(User).where(User.username == username)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def create_api_user(self, username: str, password_hash: str) -> User:
        user = User(username=username, password_hash=password_hash)
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user


class BookRepository:
    """书籍与章节相关操作。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, book_id: int) -> Optional[Book]:
        return await self.session.get(Book, book_id)

    async def list_by_library(self, library_id: int) -> Sequence[Book]:
        stmt = (
            select(Book)
            .where(Book.library_id == library_id)
            .order_by(Book.series, Book.series_index, Book.title)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def upsert_settings(
        self,
        book_id: int,
        user_id: int,
        playback_speed: float = 1.0,
        volume_boost: float = 0.0,
        skip_intro: int = 0,
    ) -> BookSettings:
        stmt = select(BookSettings).where(
            BookSettings.book_id == book_id, BookSettings.user_id == user_id
        )
        result = await self.session.execute(stmt)
        settings = result.scalars().first()
        if not settings:
            settings = BookSettings(
                book_id=book_id,
                user_id=user_id,
                playback_speed=playback_speed,
                volume_boost=volume_boost,
                skip_intro=skip_intro,
            )
            self.session.add(settings)
        else:
            settings.playback_speed = playback_speed
            settings.volume_boost = volume_boost
            settings.skip_intro = skip_intro
        await self.session.commit()
        await self.session.refresh(settings)
        return settings


class ProgressRepository:
    """进度同步：保证唯一性，兼容智能回退。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, user_id: int, book_id: int) -> Optional[Progress]:
        stmt = select(Progress).where(
            Progress.user_id == user_id, Progress.book_id == book_id
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def upsert(
        self,
        user_id: int,
        book_id: int,
        last_played_time_ms: int,
        last_played_chapter: Optional[str] = None,
        smart_rewind_seconds: int = 0,
    ) -> Progress:
        progress = await self.get(user_id=user_id, book_id=book_id)
        if not progress:
            progress = Progress(
                user_id=user_id,
                book_id=book_id,
                last_played_time_ms=last_played_time_ms,
                last_played_chapter=last_played_chapter,
                smart_rewind_seconds=smart_rewind_seconds,
            )
            self.session.add(progress)
        else:
            progress.last_played_time_ms = last_played_time_ms
            progress.last_played_chapter = last_played_chapter
            progress.smart_rewind_seconds = smart_rewind_seconds
        try:
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            raise
        await self.session.refresh(progress)
        return progress

    async def history(self, user_id: int) -> List[Progress]:
        stmt = select(Progress).where(Progress.user_id == user_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
