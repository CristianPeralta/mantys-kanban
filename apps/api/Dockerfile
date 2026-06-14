FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma

RUN apk add --no-cache openssl && npm ci

RUN apps/api/node_modules/.bin/prisma generate --schema=apps/api/prisma/schema.prisma

COPY packages/types ./packages/types
COPY apps/api ./apps/api

RUN npm run build --workspace=packages/types
RUN npm run build --workspace=apps/api

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/

RUN npm ci --omit=dev

COPY --from=builder /app/apps/api/node_modules/.prisma /app/apps/api/node_modules/.prisma

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

COPY apps/api/entrypoint.sh ./apps/api/entrypoint.sh
RUN chmod +x ./apps/api/entrypoint.sh

EXPOSE 3000

CMD ["./apps/api/entrypoint.sh"]
