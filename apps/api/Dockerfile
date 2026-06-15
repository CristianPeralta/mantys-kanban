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

FROM node:20-alpine AS pruner

WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

RUN npm prune --omit=dev

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY --from=pruner /app/node_modules ./node_modules
COPY --from=pruner /app/apps/api/node_modules ./apps/api/node_modules

# class-validator and class-transformer are workspace-local (apps/api) but @nestjs/common
# resolves them from root node_modules. Symlink to fix resolution without changing package.json.
RUN ln -s /app/apps/api/node_modules/class-validator /app/node_modules/class-validator && \
    ln -s /app/apps/api/node_modules/class-transformer /app/node_modules/class-transformer

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

COPY apps/api/entrypoint.sh ./apps/api/entrypoint.sh
RUN chmod +x ./apps/api/entrypoint.sh

EXPOSE 3000

CMD ["./apps/api/entrypoint.sh"]
