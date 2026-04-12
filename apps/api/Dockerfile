# Build context must be the MONOREPO ROOT so @dsx/shared resolves via npm workspaces.
# docker build -f apps/api/Dockerfile .

# ─── Development stage (used by docker-compose dev) ──────────────────────────
FROM node:20-alpine AS development

WORKDIR /workspace

# Install deps from monorepo root (creates workspace symlinks)
COPY package*.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN npm ci

COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

WORKDIR /workspace/apps/api
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ─── Builder stage ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /workspace

# Install all deps (dev + prod) — sets up @dsx/shared workspace symlink
COPY package*.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN npm ci

COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

WORKDIR /workspace/apps/api
# Generate Prisma client before building
RUN npx prisma generate
# Webpack bundles @dsx/shared inline — no symlink needed at runtime
RUN npm run build

# ─── Production deps stage ────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /workspace

COPY package*.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN npm ci --omit=dev

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# @dsx/shared is bundled into dist/main.js by webpack — only real npm deps needed
COPY --from=deps --chown=appuser:appgroup /workspace/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /workspace/apps/api/dist ./dist
COPY --from=builder --chown=appuser:appgroup /workspace/apps/api/package.json ./package.json
# Prisma schema for prisma migrate deploy on startup
COPY --from=builder --chown=appuser:appgroup /workspace/apps/api/prisma ./prisma

USER appuser

EXPOSE 3000

CMD ["node", "dist/main"]
