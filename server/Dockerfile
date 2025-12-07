# server/Dockerfile
# Build backend with deterministic, optional-free installs suitable for NAS docker-compose
FROM node:20-bookworm-slim as base

# Disable npm optional deps (avoid rollup/esbuild optional binaries) and reduce noise
ENV NODE_ENV=production \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_OPTIONAL=false

# Install runtime + build prerequisites for sqlite3 native bindings and ffmpeg duration scans
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      ffmpeg \
      build-essential \
      python3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests first for better docker layer caching
COPY package*.json ./

# Install production deps only, skipping optional binaries that break on some hosts
RUN npm config set optional false \
    && npm ci --omit=dev --no-optional \
    && npm cache clean --force

# Copy backend source
COPY . .

EXPOSE 3000
CMD ["node", "index.js"]
