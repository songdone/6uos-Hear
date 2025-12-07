# server/Dockerfile
FROM node:18-alpine

# 安装 ffmpeg (计算音频时长必须)
RUN apk add --no-cache ffmpeg

WORKDIR /app

# 复制后端依赖配置
COPY package.json ./

# 安装后端依赖
RUN npm install --production

# 复制后端所有源代码
COPY . .

# 暴露后端端口
EXPOSE 3000

# 启动命令
CMD ["node", "index.js"]