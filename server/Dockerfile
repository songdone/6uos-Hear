# server/Dockerfile
FROM node:18-bullseye-slim

# 安装 ffmpeg (计算音频时长必须)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制后端依赖配置
COPY package*.json ./

# 安装后端依赖（生产环境、使用锁文件确保一致性）
RUN npm ci --omit=dev

# 复制后端所有源代码
COPY . .

# 暴露后端端口
EXPOSE 3000

# 启动命令
CMD ["node", "index.js"]