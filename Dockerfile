# Dockerfile (位于根目录)

# --- Stage 1: Build Frontend ---
# 使用 Debian slim 避免 musl 下 rollup/esbuild 可选依赖的二进制缺失问题
FROM node:20-bookworm-slim as builder
WORKDIR /app
# 复制根目录的依赖配置
COPY package*.json ./

# 禁用可选依赖，确保 CI/容器的 rollup/esbuild 二进制始终一致
RUN npm config set fund false \
    && npm config set audit false \
    && npm config set optional false
# 安装依赖（使用锁文件确保与 NAS 构建一致）
RUN npm ci --no-optional

# 复制所有源代码
COPY . .
# 执行构建 (Vite 会打包到 /dist)
RUN npm run build

# --- Stage 2: Nginx Serve ---
FROM nginx:alpine
# 复制构建产物到 Nginx
COPY --from=builder /app/dist /usr/share/nginx/html
# 复制 Nginx 配置文件 (注意这里对应你目录里的 nginx 文件夹)
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]