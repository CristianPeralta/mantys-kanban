FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace config
COPY package.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/api/package.json ./apps/api/

RUN npm install

# Copy source
COPY packages/types ./packages/types
COPY apps/api ./apps/api

RUN npm run build --workspace=packages/types
RUN npm run build --workspace=apps/api

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages/types/package.json ./packages/types/
RUN npm install --omit=dev

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist

EXPOSE 3000

CMD ["node", "apps/api/dist/main"]
