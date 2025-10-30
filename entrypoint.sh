#!/bin/sh
set -e
# Set environment variables for Prisma
export PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-linux-musl-openssl-3.0.x.so.node
export PRISMA_QUERY_ENGINE_BINARY=/app/node_modules/.prisma/client/query-engine-linux-musl-openssl-3.0.x

# Run Prisma DB migrate deploy. Requires DATABASE_URL to be set.
# echo "Running Prisma DB migrate deploy..."
npx prisma migrate deploy

# Execute the command passed as arguments to this script (which is the CMD from Dockerfile)
echo "Starting Nuxt server..."
exec "$@"

