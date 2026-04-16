FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN npm ci --workspace=@eru/api --workspace=@eru/shared
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/
RUN cd apps/api && npx prisma generate
RUN cd apps/api && npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/src/admin-panel ./apps/api/dist/admin-panel
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY apps/api/package.json apps/api/
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]
