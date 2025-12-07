"""
核心数据库模型定义。
使用 SQLModel 以保持类型安全与可维护性，并为高并发场景预留异步会话支持。
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional

from sqlmodel import Column, Field, JSON, SQLModel, UniqueConstraint


class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, sa_column_kwargs={"unique": True})
    email: Optional[str] = Field(default=None, index=True, description="可选登录邮箱/通知入口")
    avatar_url: Optional[str] = Field(default=None, description="头像地址，支持外链与本地")
    display_name: Optional[str] = Field(default=None, description="用户展示昵称")
    password_hash: str = Field(description="BCrypt/Argon2 哈希")
    role: UserRole = Field(default=UserRole.USER, description="用户角色")
    api_key: Optional[str] = Field(default=None, index=True, description="用于 CLI/移动端的长效令牌")
    preferences: dict = Field(
        sa_column=Column(JSON),
        default_factory=dict,
        description="全局偏好 JSON，如主题、播放习惯、无障碍设置等",
    )
    locale: str = Field(default="zh-CN", description="默认语言/本地化")
    timezone: str = Field(default="Asia/Shanghai", description="时区，便于报告与计划任务")
    last_login_at: Optional[datetime] = Field(default=None, description="上次成功登录时间")
    last_device: Optional[str] = Field(default=None, description="最近使用的设备指纹/UA")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="账号创建时间")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="更新时间戳")


class Library(SQLModel, table=True):
    __tablename__ = "libraries"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, description="库名称")
    root_path: str = Field(description="NAS/本地路径映射")
    scan_interval_minutes: int = Field(default=30, description="Watchdog 扫描间隔")
    last_scanned_at: Optional[datetime] = Field(default=None, description="最后扫描时间")


class Book(SQLModel, table=True):
    __tablename__ = "books"
    __table_args__ = (
        UniqueConstraint("library_id", "folder_path", name="uix_library_folder"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    library_id: int = Field(foreign_key="libraries.id", index=True)
    title: str = Field(index=True)
    media_entry_name: Optional[str] = Field(
        default=None,
        description="媒体入口自定义名称，用于前端展示/路径重命名",
    )
    author: Optional[str] = Field(default=None, index=True)
    narrator: Optional[str] = Field(default=None, description="演播者")
    series: Optional[str] = Field(default=None, index=True)
    series_index: Optional[float] = Field(default=None, description="系列顺序，支持小数")
    genres: List[str] = Field(
        sa_column=Column(JSON),
        default_factory=list,
        description="多标签分类，存储为 JSON 数组",
    )
    cover_path: Optional[str] = Field(default=None, description="封面相对路径")
    folder_path: str = Field(description="有声书文件夹路径")
    language: Optional[str] = Field(default="zh", description="语言代码，便于过滤与 TTS 扩展")
    published_year: Optional[int] = Field(default=None, description="出版年份/首发年份")
    chapter_count: Optional[int] = Field(default=None, description="章节数量")
    chapter_order_strategy: str = Field(
        default="natural_asc",
        description="章节排序策略：natural_asc 保证 1-99 自然排序",
    )
    total_duration: Optional[int] = Field(default=None, description="总时长，秒级")
    average_lufs: Optional[float] = Field(default=None, description="源文件响度分析值，配合归一化")
    silence_profile: Optional[dict] = Field(
        sa_column=Column(JSON),
        default=None,
        description="静音分布/跳过建议，供前端展示",
    )
    description: Optional[str] = Field(default=None, description="剧情简介")
    review_needed: bool = Field(
        default=False,
        description="瀑布流匹配置信度 < 0.8 时标记，等待人工确认",
    )
    confidence_score: Optional[float] = Field(default=None, description="自动刮削置信度数值")
    content_rating: Optional[str] = Field(default=None, description="分级/儿童模式过滤依据")
    tags: List[str] = Field(
        sa_column=Column(JSON),
        default_factory=list,
        description="用户自定义标签，补充 genres",
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class BookSettings(SQLModel, table=True):
    __tablename__ = "book_settings"
    __table_args__ = (
        UniqueConstraint("book_id", "user_id", name="uix_book_user_settings"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    book_id: int = Field(foreign_key="books.id", index=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    playback_speed: float = Field(default=1.0, description="独立倍速设置")
    volume_boost: float = Field(default=0.0, description="dB 增益，配合响度归一化")
    skip_intro: int = Field(default=0, description="跳过片头秒数")
    skip_outro: int = Field(default=0, description="跳过片尾秒数，便于快速下一本")
    loudness_target_lufs: float = Field(default=-16.0, description="用户偏好的响度目标")
    smart_rewind_threshold: int = Field(
        default=300,
        description="智能回退启动阈值（秒），便于 A/B 测试",
    )
    driving_mode_enabled: bool = Field(default=False, description="驾驶模式开关")
    driving_haptic_feedback: bool = Field(
        default=True, description="驾驶模式是否保留震动提示"
    )
    sleep_timer_minutes: Optional[int] = Field(default=None, description="睡眠模式倒计时分钟")
    oled_black_enabled: bool = Field(default=False, description="是否强制 OLED 纯黑主题")
    skip_silence_enabled: bool = Field(default=True, description="前端静音跳过开关")
    skip_silence_threshold_db: float = Field(
        default=-40.0, description="静音判定阈值，默认 -40dB"
    )
    network_preference: str = Field(
        default="auto",
        description="网络策略：auto/wifi_only/hls_preferred",
    )
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Chapter(SQLModel, table=True):
    __tablename__ = "chapters"
    __table_args__ = (
        UniqueConstraint("book_id", "order_index", name="uix_book_chapter_order"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    book_id: int = Field(foreign_key="books.id", index=True)
    title: str = Field(description="章节标题，支持自然排序")
    file_path: Optional[str] = Field(default=None, description="章节音频文件相对路径")
    order_index: int = Field(default=1, description="显示顺序，默认 1 起")
    natural_sort_key: Optional[str] = Field(
        default=None,
        description="自然排序键，如前端解析出的 01/1/第1章，用于 1-99 顺序稳定",
    )
    duration: Optional[int] = Field(default=None, description="章节时长（秒）")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PlaybackSession(SQLModel, table=True):
    __tablename__ = "playback_sessions"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    book_id: int = Field(foreign_key="books.id", index=True)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = Field(default=None)
    device: Optional[str] = Field(default=None, description="设备指纹/UA")
    network: Optional[str] = Field(default=None, description="wifi/cellular 自动转码依据")
    bitrate: Optional[int] = Field(default=None, description="播放/转码实际码率 (kbps)")
    loudness_normalized: bool = Field(default=False, description="FFmpeg 是否已归一化")
    silence_skipped: bool = Field(default=False, description="前端静音跳过是否开启")
    media_session_payload: Optional[dict] = Field(
        sa_column=Column(JSON),
        default=None,
        description="MediaSession 下发的元数据快照",
    )


class Progress(SQLModel, table=True):
    __tablename__ = "progress"
    __table_args__ = (
        UniqueConstraint("user_id", "book_id", name="uix_user_book_progress"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    book_id: int = Field(foreign_key="books.id", index=True)
    last_played_time_ms: int = Field(default=0, description="毫秒级进度")
    last_played_chapter: Optional[str] = Field(default=None, description="章节标识")
    last_interaction_at: datetime = Field(default_factory=datetime.utcnow)
    smart_rewind_seconds: int = Field(default=0, description="针对断点失忆症的自动回退秒数")
    device_fingerprint: Optional[str] = Field(
        default=None, description="上报设备，用于冲突解决"
    )


__all__ = [
    "User",
    "UserRole",
    "Library",
    "Book",
    "BookSettings",
    "Chapter",
    "PlaybackSession",
    "Progress",
]
