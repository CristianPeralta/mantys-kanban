FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace config and lock file
COPY package.json package-lock.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/api/package.json ./apps/api/

RUN npm ci

# Copy source
COPY packages/types ./packages/types
COPY apps/api ./apps/api

RUN npm run build --workspace=packages/types
RUN npm run build --workspace=apps/api

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/

RUN npm ci --omit=dev --ignore-scripts

# Prisma generated client + CLI assets from builder (safety net if postinstall is skipped)
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

COPY apps/api/entrypoint.sh ./apps/api/entrypoint.sh
RUN chmod +x ./apps/api/entrypoint.sh

EXPOSE 3000

CMD ["./apps/api/entrypoint.sh"]
