#!/bin/sh
set -e

cd /app/apps/api
echo "[entrypoint] running prisma migrate deploy"
npx prisma migrate deploy
echo "[entrypoint] starting API"
exec node dist/main
