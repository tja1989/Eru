FROM node:22-alpine AS builder
WORKDIR /app

# Root config files (tsconfig.base.json is extended by every workspace tsconfig)
COPY package.json package-lock.json tsconfig.base.json ./

# Workspace manifests (needed for npm workspaces resolution)
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

# Install deps for both workspaces
RUN npm ci --workspace=@eru/api --workspace=@eru/shared

# Source code
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

# Generate Prisma client BEFORE building (tsc needs the @prisma/client types)
RUN cd apps/api && npx prisma generate

# Build shared FIRST so @eru/api can import compiled types from ./dist
RUN npm run build --workspace=@eru/shared
RUN cd apps/api && npm run build

# ----------
# Production image
# ----------
FROM node:22-alpine
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY apps/api/package.json ./apps/api/
COPY package.json ./

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]
