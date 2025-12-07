# 6uos Hear (留你听书) 全栈骨架与产品蓝图

> **使命：** 打造超越 Audiobookshelf 的中文有声书平台，兼顾高并发、元数据洁癖、极致交互与琉璃质感视觉。以下蓝图覆盖目录结构、数据模型、API、播放器状态以及 10 大细分模块与 100 条用户体验微创新。

## 步骤一：项目目录结构树
```
backend/
  app/
    api/
      __init__.py
      auth.py                 # JWT/API Key、角色鉴权、中间件注入设备指纹
      libraries.py            # 多库管理、瀑布流刮削触发、增量刷新
      books.py                # 书籍详情、设置、批量元数据编辑
      playback.py             # 播放心跳、HLS/直链分发、媒体会话记录
      metadata.py             # 聚合搜索、手动匹配向导、正则重命名
      reports.py              # 年度报告、收听统计
      uploads.py              # 封面/音频上传、校验与秒传
    core/
      config.py               # 环境变量、PWA 资产地址、FFmpeg 配置
      logging.py              # 结构化日志、请求链路追踪
      security.py             # 密码哈希、API Key 校验、速率限制
      tasks.py                # APScheduler/Watchdog 注册、转码/归一化队列
    models.py                 # SQLModel 表定义（Users/Books/BookSettings/Progress 等）
    db.py                     # 异步引擎/会话工厂，支持 sqlite+aiosqlite
    repositories.py           # 仓储层：用户、书籍、进度、播放会话
    services/
      scanner/
        waterfall.py          # 瀑布流四级匹配引擎（本地→Tag→正则→在线）
        confidence.py         # 置信度计算、review_needed 标记
      audio/
        loudness.py           # -16 LUFS 归一化任务封装
        silence.py            # 跳过静音分析与前端参数下发
        transcode.py          # Wi-Fi 直链/蜂窝 HLS 128kbps AAC
      metadata/
        rename.py             # 正则批量重命名 & 预览
        manual_match.py       # 5 条候选的人工选择引导
      notifications/
        webhook.py            # 收听进度、年度报告推送
        broadcast.py          # 设备同步、锁屏更新
      analytics/
        reports.py            # 播放会话聚合、年度报告生成
  tests/
    api/                      # FastAPI 路由单测
    services/                 # 刮削/转码/重命名用例

frontend/
  public/                     # PWA 资源与品牌资产 (favicon/touch icon)
  src/
    api/                      # Axios 客户端、类型定义
    assets/                   # Glassmorphism 样式、图标
    components/               # 通用 UI、Vinyl Spin 播放器部件
    composables/              # 播放器控制、网络探测、触摸手势
    layouts/                  # 多模式布局（驾驶、睡眠、OLED 黑）
    router/                   # 路由与守卫（角色/离线/驾驶模式）
    stores/                   # Pinia 持久化状态（播放器、用户、离线缓存）
    views/                    # 页面（首页、书库、编辑器、报告）
    workers/                  # Service Worker、离线缓存策略
  tests/
    e2e/                      # 端到端交互验证
```

### 10 个细分模块（后端/前端协同）
1. **智能刮削引擎**：瀑布流多级匹配 + 置信度回传。
2. **响度/静音管线**：FFmpeg LUFS 归一化 + Web Audio Skip Silence。
3. **元数据编辑器**：正则重命名、媒体入口别名、手动匹配向导、批量封面替换。
4. **播放策略管理**：Wi-Fi 直链 / 蜂窝 HLS、自适应码率预留。
5. **驾驶模式**：大号控件、手势调节、语音播报。
6. **睡眠模式**：倒计时、剧烈摇晃复位、柔和淡出。
7. **OLED 纯黑 & 主题**：系统检测 + 电源策略联动。
8. **多设备同步**：MediaSession、耳机线控、手表/车机推送。
9. **离线缓存 & PWA**：可选章节缓存、快速恢复、断网提示。
10. **年度报告 & 成就**：播放会话聚合、徽章/连续打卡反馈。

### 100 条用户细节体验微创新
1. 首页玻璃拟态卡片随播放进度渐变。  
2. 封面黑胶旋转，播放时缓入缓出。  
3. 暂停/播放振动 50ms 提示。  
4. Wi-Fi/蜂窝自动切换码率并弹出气泡说明。  
5. 断点 >5 分钟自动回退 10s。  
6. 断点 >1 小时回退 30s。  
7. 断点 >24 小时回退 60s。  
8. 睡眠倒计时结束自动淡出音量。  
9. 摇一摇重置睡眠定时器。  
10. OLED 模式强制纯黑背景。  
11. 驾驶模式单指滑动调节音量。  
12. 驾驶模式双击切章节。  
13. 驾驶模式语音提示当前章节。  
14. 前端实时静音检测阈值 -40dB。  
15. 静音持续 >2s 自动跳过。  
16. 封面长按复制书名与演播者。  
17. 章节列表支持手势排序预览，并保证 1～99 自然排序不乱序。
18. 正则重命名冲突高亮提示，媒体入口别名实时预览。
19. 批量封面拖拽上传秒传校验。  
20. 手动匹配向导展示 5 条候选并带置信度。  
21. 缺封面时自动生成渐变占位图。  
22. 每本书独立倍速记忆。  
23. 每本书独立响度增益记忆。  
24. Skip Intro 秒数 per book 记忆。  
25. Skip Outro 秒数 per book 记忆。  
26. 网络离线提示并展示离线可播章节。  
27. 播放器底栏支持浮动迷你模式。  
28. MediaSession 显示高清封面。  
29. MediaSession 显示当前章节名。  
30. 耳机线控双击切下一章。  
31. 耳机线控长按调节倍速。  
32. Watchdog 检测库变化自动刷新。  
33. 扫描日志实时流式返回前端。  
34. FFmpeg 任务队列支持并发度配置。  
35. HLS Playlist 嵌入章节元数据。  
36. HLS Keyframe 对齐确保 Seek 顺滑。  
37. Pinia 持久化播放器状态至 IndexedDB。  
38. PWA 安装指引内置品牌动效。  
39. 离线模式自动缓存下一章节。  
40. 缓存满额时提示并支持一键清理。  
41. 书库支持按演播者/系列/标签过滤。  
42. 书库卡片展示总时长与完成度。  
43. 进度条显示 Smart Rewind 预估标记。  
44. 前端波形可视化辅助 Seek。  
45. 章节内搜索高亮结果。  
46. 书签支持备注与时间戳。  
47. 书签支持导出/导入。  
48. 年度报告展示最常听的演播者。  
49. 年度报告展示收听日历。  
50. 连续听书天数徽章。  
51. 夜间模式自动降低界面亮度。  
52. 夜间模式降低高光色饱和度。  
53. 进度同步冲突时弹出合并提示。  
54. API Key 页面支持复制与重置。  
55. 登录支持设备信任标记。  
56. 安全日志记录异地登录提醒。  
57. 正则重命名支持模板预览。  
58. 刮削置信度低于 0.8 强制人工确认。  
59. 扫描时忽略小于 300KB 的碎片文件。  
60. 多库路径映射支持优先级。  
61. 章节跨设备同步延迟 <1s（心跳上报）。  
62. 播放心跳携带网络类型与设备指纹。  
63. Loudness 归一化状态在 UI 中可见。  
64. 静音跳过计数在播放浮层展示。  
65. 倍速调节提供常用档位快捷键。  
66. 键盘快捷键 J/L 快退/快进。  
67. 触屏双指缩放控制进度精度。  
68. 车机模式自动隐藏不必要元素。  
69. PWA 离线包包含品牌字体。  
70. 章节切换时震动反馈。  
71. 章节下载进度条可暂停/恢复。  
72. 音频错误自动重试三次并降级码率。  
73. 章节描述展示文本摘要。  
74. 书籍简介支持 Markdown 渲染。  
75. 个人偏好存储主题/字体/手势灵敏度。  
76. OLED 黑模式自动关闭多余阴影。  
77. Glassmorphism Blur 依设备性能自动调节。  
78. 低端设备自动关闭波形动画。  
79. 页内提示「已启用静音跳过」。  
80. 播放器显示 LUFS 目标与当前响度。  
81. 章节内二维码分享。  
82. 章节试读/试听片段。  
83. 书库批量选择批量操作。  
84. 书库支持「最近更新」排序。  
85. 播放历史可按日期分组。  
86. 进度条支持章节分段刻度。  
87. 章节名滚动字幕防截断。  
88. 锁屏歌词式章节标题。  
89. HLS 多 CDN 预留切换接口。  
90. 设备上报延迟分析看板。  
91. 支持多账号家庭成员分级权限。  
92. 儿童模式过滤敏感内容。  
93. 访客模式仅播放试听章节。  
94. API 速率限制防刷。  
95. 每日一言/听书打卡提醒。  
96. 睡眠模式到期后提示「已暂停」。  
97. 章节列表快速跳转当前播放位置。  
98. 交互动画全局 240ms 曲线统一。  
99. 设备/网络提示在 Toast 中展示。
100. 所有错误文案具备幽默彩蛋。

## 步骤二：数据库核心模型代码（backend/app/models.py）
详见源码，覆盖 `User`（角色、偏好、API Key、安全审计）、`Book`（系列、演播者、响度、匹配置信度、媒体入口别名、章节排序策略）与独立的 `BookSettings`（倍速、响度增益、跳过片头/片尾、驾驶/睡眠偏好），新增 `Chapter` 表存放章节顺序（1 起自然排序）与文件路径，并补充 `PlaybackSession`、`Progress` 等历史与同步表。字段精细到毫秒级进度与 LUFS 目标，满足断点失忆症、声音洁癖与 OCD 整理的场景。

## 步骤三：核心 API 路由规划
| Method & Path | 功能 | 关键点 |
| --- | --- | --- |
| `POST /api/auth/login` | 登录并返回 JWT/API Key | 设备指纹 + 角色鉴权 |
| `POST /api/auth/refresh` | 刷新 Token | 长效移动端续期 |
| `GET /api/users/me` | 当前用户信息 | 偏好、角色、最近设备 |
| `PATCH /api/users/me/preferences` | 更新全局偏好 | OLED 黑/驾驶/睡眠默认值 |
| `POST /api/library/scan` | 触发瀑布流智能刮削 | 四级 Waterfall + review_needed |
| `GET /api/library/scan/status` | 查看扫描进度 | Watchdog/队列状态 |
| `POST /api/library/{id}/refresh` | 指定库增量刷新 | 缺封面补全、忽略碎片文件 |
| `GET /api/libraries` | 列出库与优先级 | 路径映射、可写状态 |
| `GET /api/books` | 分页查询书目 | 系列/演播者/标签/语言过滤 |
| `GET /api/book/{id}` | 书籍详情 | LUFS 状态、章节元数据 |
| `PATCH /api/book/{id}/media-entry` | 重命名媒体入口 | 更新 media_entry_name，前端立即展示 |
| `PATCH /api/book/{id}/settings` | 更新 BookSettings | 倍速/增益/skip intro/outro/驾驶 |
| `PATCH /api/book/{id}/chapters/order` | 提交章节排序 | 支持自然排序 1～99 与手动调整 |
| `POST /api/book/{id}/bookmark` | 添加书签 | 备注+时间戳 |
| `GET /api/book/{id}/progress` | 获取用户进度 | 毫秒进度与 smart rewind 建议 |
| `POST /api/book/{id}/progress` | 同步进度 | last_played_time_ms + device |
| `POST /api/player/sync` | 播放器心跳 | 网络/设备/静音跳过统计 |
| `POST /api/player/session` | 开始播放会话 | 直链或 HLS 策略返回 |
| `PATCH /api/player/session/{id}/stop` | 结束会话 | 汇总时长、回传下一章节 |
| `POST /api/metadata/search` | 聚合刮削 | iTunes/Google/OpenLibrary/Douban 入口 |
| `POST /api/metadata/rename-preview` | 重命名预览 | 模板占位符 + 冲突检测 |
| `GET /api/metadata/manual-match` | 手动匹配向导 | 返回 5 条搜索结果 |
| `POST /api/processing/loudness` | 触发响度归一化 | FFmpeg -16 LUFS 入队 |
| `GET /api/processing/tasks` | 处理任务状态 | 转码/归一化进度条 |
| `GET /api/reports/yearly` | 年度收听报告 | 聚合 PlaybackSessions |
| `GET /api/reports/achievements` | 成就/打卡 | 连续天数、最常听演播者 |
| `POST /api/cache/offline` | 预缓存章节 | 离线播放与容量控制 |
| `DELETE /api/cache/offline` | 清理缓存 | 逐章节或全量 |

## 步骤四：前端播放器状态管理（frontend/src/stores/player.ts）
`Pinia` 持久化存储播放器核心状态，包含智能回退（毫秒级 lastPausedAt 与规则计算）、静音跳过开关与阈值、驾驶/睡眠模式、网络自适应转码、MediaSession 元数据、振动反馈与 OLED 黑模式偏好。详见源码内中文注释。
