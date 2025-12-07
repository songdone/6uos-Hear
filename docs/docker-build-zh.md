# 6uos Hear Docker 打包与部署指南（中文）

> 目标：在 NAS 上使用给定的绝对路径 compose 配置，前后端镜像 **100% 可构建**、运行后数据持久化且功能生效。

## 基础环境要求
- 操作系统：Debian/Ubuntu 系（示例为 ZOS，内核 5.19+）
- Docker 26+、docker compose 2.x
- Node.js 20.x、npm 10.x（仅用于检查，不参与容器内构建）
- 确保有声书与数据库目录已存在（以下路径中的 `nasuser` 为示例占位，按实际 NAS 用户目录替换）：
  - `/tmp/zfsv3/sata14/nasuser/data/PlaySong Media/有声书`（库路径）
  - `/tmp/zfsv3/nvme12/nasuser/data/Docker/6uos-hear-git/data`（数据库/配置持久化）

## 目录与重要文件
```
repo-root/
├─ Dockerfile            # 前端镜像（Vite -> dist -> Nginx）
├─ server/Dockerfile     # 后端镜像（Node 20 + sqlite3 + ffmpeg）
├─ docker-compose.yml    # 可复用，也可使用下方提供的绝对路径 compose
├─ server/.dockerignore  # 过滤宿主 node_modules / 数据文件
└─ .dockerignore         # 过滤前端/根目录的 node_modules、dist、sqlite 等
```

## 前端镜像构建说明
- 基础镜像：`node:20-bookworm-slim`（避免 musl 下 rollup/esbuild 可选二进制缺失）。
- 安装参数：`npm ci --no-optional`，禁止可选依赖以避免 @rollup/rollup-*-musl 安装失败。
- 产物：仅将 `/app/dist` 拷贝到 `nginx:alpine`，最终镜像体积保持轻量。

如需单独构建前端镜像（可选）：
```bash
# 在仓库根目录
docker build -t 6uos-hear-frontend .
```

## 后端镜像构建说明
- 基础镜像：`node:20-bookworm-slim`
- 依赖：`ffmpeg`、`build-essential`、`python3`（用于 sqlite3 原生模块编译与时长扫描）。
- 安装参数：`npm ci --omit=dev --omit=optional`，彻底禁用可选依赖。
- 暴露端口：3000
- 使用 `LIBRARY_PATH` 和 `DB_PATH` 环境变量指向宿主挂载卷。

如需单独构建后端镜像（可选）：
```bash
# 在仓库根目录
docker build -t 6uos-hear-backend server
```

## 强制使用的 docker-compose（绝对路径示例）
```yaml
services:
  backend:
    container_name: 6uos_backend
    build:
      context: /tmp/zfsv3/nvme12/nasuser/data/Docker/6uos-hear-git/server
      dockerfile: Dockerfile
    restart: always
    environment:
      - PORT=3000
      - DB_PATH=/data/database_V2.sqlite
      - LIBRARY_PATH=/mnt/library
      - JWT_SECRET=6uos_Hear_Secret_Key_666
    volumes:
      - "/tmp/zfsv3/sata14/nasuser/data/PlaySong Media/有声书:/mnt/library"
      - "/tmp/zfsv3/nvme12/nasuser/data/Docker/6uos-hear-git/data:/data"

  frontend:
    container_name: 6uos_frontend
    build:
      context: /tmp/zfsv3/nvme12/nasuser/data/Docker/6uos-hear-git
      dockerfile: Dockerfile
    restart: always
    ports:
      - "16661:80"
    depends_on:
      - backend
```

## 构建步骤（确保成功的操作顺序）
1. **清理宿主旧缓存**（避免历史 node_modules 干扰）：
   ```bash
   rm -rf /tmp/zfsv3/nvme12/nasuser/data/Docker/6uos-hear-git/server/node_modules \
          /tmp/zfsv3/nvme12/nasuser/data/Docker/6uos-hear-git/node_modules
   ```
2. **拉取最新代码**：`git pull`
3. **构建**：在仓库根目录执行
   ```bash
   docker compose build --no-cache
   ```
4. **启动**：
   ```bash
   docker compose up -d
   ```
5. **验证**：
   - 前端：访问 `http://<NAS_IP>:16661`
   - 后端健康检查：`docker logs 6uos_backend | head`，确认数据库路径与库路径挂载正确。

## 常见问题排查
- **可选依赖导致的 @rollup/rollup-* 缺失**：已在 Dockerfile 中禁用，可确保 Debian slim 环境构建成功。如仍报错，执行 `docker compose build --no-cache` 确保未复用旧层。
- **镜像体积膨胀**：前端最终镜像仅包含 Nginx + dist；后端镜像可选在构建后执行 `docker image prune -f` 清理中间层。
- **数据未持久化**：确认 compose 的 `volumes` 路径与 `DB_PATH`、`LIBRARY_PATH` 一致，容器内 `/data` 会写入宿主 `data` 目录。

## 关键设计保证
- 前后端均使用锁文件（`package-lock.json`、`server/package-lock.json`），配合 `npm ci` 确保依赖版本锁定。
- Debian slim 基础镜像规避 musl 下的二进制可选包；`--omit=optional`/`--no-optional` 已禁用可选依赖。
- `.dockerignore`/`server/.dockerignore` 已排除宿主的 node_modules 与数据库文件，避免平台不匹配和体积暴涨。

如按以上步骤执行，后端/前端镜像均可在 NAS 上稳定构建并保持功能正常。 
