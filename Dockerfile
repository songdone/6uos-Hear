# Dockerfile (位于根目录)

# --- Stage 1: Build Frontend ---
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./

# 关闭 fund / audit 即可，保持可选依赖启用以避免编译缺失
RUN npm config set fund false \
    && npm config set audit false

# 构建阶段安装全部依赖（包含 optional），保持与本地 npm ci 一致
RUN npm ci \
    && npm cache clean --force

COPY . .

RUN npm run build

# --- Stage 2: Nginx Serve ---
FROM nginx:alpine
# 复制构建产物到 Nginx
COPY --from=builder /app/dist /usr/share/nginx/html
# 复制 Nginx 配置文件 (注意这里对应你目录里的 nginx 文件夹)
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]