# Google Cloud Run deployment for Agentic-Space Backend
# Uses multi-stage build to minimize image size

FROM node:22-alpine AS build

# Install pnpm
RUN npm install -g pnpm@11.5.2

ENV CI=true

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile --shamefully-hoist

COPY packages/shared packages/shared
COPY apps/backend apps/backend

RUN pnpm --filter @agentic-space/shared build
RUN pnpm --filter @agentic-space/backend build

FROM node:22-alpine AS runner
WORKDIR /app

# Install pnpm in runner stage
RUN npm install -g pnpm@11.5.2

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/

# Fresh install in runner stage (avoids broken symlinks from multi-stage COPY)
RUN pnpm install --frozen-lockfile --prod --shamefully-hoist

# Copy compiled artifacts
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/backend/dist ./apps/backend/dist

# Create directories for runtime data
RUN mkdir -p logs/uploads

# Cloud Run provides PORT env var (typically 8080)
# The config.ts reads process.env.PORT || "3001", so it adapts automatically
ENV NODE_ENV=production

CMD ["node", "apps/backend/dist/index.js"]
