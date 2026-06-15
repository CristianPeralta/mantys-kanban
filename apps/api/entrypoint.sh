#!/bin/sh
set -e

echo "[entrypoint] running prisma migrate deploy"
apps/api/node_modules/.bin/prisma migrate deploy --schema=apps/api/prisma/schema.prisma
echo "[entrypoint] starting API"
exec node apps/api/dist/src/main
