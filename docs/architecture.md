# 6uos Hear (留你听书) 核心骨架

## 步骤一：项目目录结构树
```
backend/
  app/
    api/                 # FastAPI 路由、依赖与安全
    models.py            # SQLModel 表定义
    services/            # 业务服务（刮削、转码、队列、推送）
    workers/             # APScheduler/Watchdog 任务
    core/                # 配置、日志、数据库引导
  tests/
frontend/
  public/               # PWA 资源与品牌资产
  src/
    api/                # Axios 封装与类型
    components/         # UI 组件（Glassmorphism）
    composables/        # 业务逻辑 hooks
    stores/             # Pinia 状态（含播放器）
    views/              # 页面与模式（驾驶/睡眠等）
    router/             # 路由与守卫
  tests/
```

## 步骤二：数据库核心模型代码
详见 `backend/app/models.py`，覆盖 Users、Books、BookSettings 等关键表，包含进度与播放会话的审计字段，满足断点失忆症、独立倍速与响度管理的场景需求。

## 步骤三：核心 API 路由规划
| Method & Path | 功能 | 关键点 |
| --- | --- | --- |
| `POST /api/auth/login` | 登录并返回 JWT/API Key | 支持角色鉴权；记录设备指纹 |
| `POST /api/auth/refresh` | 刷新 Token | 长链接/移动端续期 |
| `GET /api/users/me` | 当前用户信息 | 返回偏好与角色 |
| `PATCH /api/users/me/preferences` | 更新全局偏好 | 主题、模式、无障碍 |
| `POST /api/library/scan` | 触发瀑布流智能刮削 | 四级 Waterfall + `review_needed` 标记 |
| `GET /api/library/scan/status` | 查看扫描进度 | Watchdog/队列状态 |
| `POST /api/library/{id}/refresh` | 指定库增量刷新 | 处理新增/缺封面 |
| `GET /api/books` | 分页查询书目 | 支持系列/演播者/标签过滤 |
| `GET /api/book/{id}` | 书籍详情 | 返回封面、章节、响度状态 |
| `PATCH /api/book/{id}/settings` | 更新 BookSettings | 倍速/增益/skip intro/驾驶模式 |
| `GET /api/book/{id}/progress` | 获取用户进度 | 返回毫秒进度与 smart rewind 建议 |
| `POST /api/book/{id}/progress` | 同步进度 | 写入 `last_played_time_ms`、`smart_rewind_seconds` |
| `POST /api/player/sync` | 播放器心跳 | 提交网络环境、设备、silence skip 统计 |
| `POST /api/player/session` | 开始播放会话 | 记录网络状态、转码策略 |
| `PATCH /api/player/session/{id}/stop` | 结束会话 | 计算收听时长，生成年度报告素材 |
| `POST /api/metadata/search` | 聚合刮削 | iTunes / Google / OpenLibrary / Douban / 自定义源返回可信度 |
| `POST /api/metadata/rename-preview` | 本地重命名预览/执行 | 模板占位符（Author/Title/TrackNumber）+ 冲突检测 |
| `GET /api/metadata/manual-match` | 手动匹配向导 | 返回 5 条搜索结果待确认 |
| `POST /api/processing/loudness` | 触发响度归一化 | FFmpeg -16 LUFS，入队执行 |
| `GET /api/processing/tasks` | 处理任务状态 | 转码/归一化进度条 |
| `GET /api/reports/yearly` | 年度收听报告 | 基于 PlaybackSessions 聚合 |

## 步骤四：前端播放器状态管理
核心逻辑位于 `frontend/src/stores/player.ts`，涵盖智能回退、静音跳过、驾驶/睡眠模式、MediaSession 与振动反馈。
