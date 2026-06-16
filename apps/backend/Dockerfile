FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build -w packages/shared
RUN npm run typecheck -w packages/shared
RUN npm run build -w apps/backend

FROM base AS runner
WORKDIR /app
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages

EXPOSE 3001
CMD ["node", "dist/index.js"]
