# Fynvita Autonomous Trading Service — Fly.io Deployment
#
# Build context: monorepo root (/Users/.../Fynvita)
# Build command: docker build -f src/lib/trading/autonomous/deploy/Dockerfile .
# Or via fly.toml: fly deploy --config src/lib/trading/autonomous/deploy/fly.toml

# ---- Stage 1: Build ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY tsconfig.json ./
COPY src/ src/

# Bundle the standalone server with esbuild
# --alias:@=./src resolves @/ path aliases
# --packages=external keeps npm packages out of the bundle (installed separately)
RUN npx esbuild src/lib/trading/autonomous/standalone-server.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --outfile=dist/server.js \
  --packages=external \
  "--alias:@=./src"

# ---- Stage 2: Runtime ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV STANDALONE_MODE=true

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy bundled server
COPY --from=builder /app/dist/server.js ./server.js

# Non-root user
RUN addgroup --system --gid 1001 trading && \
    adduser --system --uid 1001 trading
USER trading

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:8080/health || exit 1

CMD ["node", "server.js"]
