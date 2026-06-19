# Google Cloud Run deployment for Agentic-Space Backend
# Uses multi-stage build to minimize image size

FROM node:22-alpine AS build

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/backend apps/backend

RUN pnpm build -w packages/shared
RUN pnpm build -w apps/backend

FROM node:22-alpine AS runner
WORKDIR /app

# Copy built artifacts
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist

# Create directories for runtime data
RUN mkdir -p logs/uploads

# Cloud Run provides PORT env var
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001
CMD ["node", "dist/index.js"]
