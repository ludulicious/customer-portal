# #!/bin/sh
# # Wait for DB to be ready (simple health check)
# until PGPASSWORD=$POSTGRES_PASSWORD psql -h "db" -U "postgres" -d "myapp" -c '\q'; do
#   >&2 echo "Postgres is unavailable - sleeping"
#   sleep 1
# done

>&2 echo "Running migrations"
npx prisma migrate deploy --schema=/app/prisma/schema.prisma

# Generate Prisma client if it doesn't exist or is outdated
if [ ! -d "/app/prisma/generated/client" ] || [ ! -f "/app/prisma/generated/client/index.js" ]; then
  >&2 echo "Generating Prisma client"
  npx prisma generate --schema=/app/prisma/schema.prisma
else
  >&2 echo "Prisma client already exists, skipping generation"
fi

>&2 echo "Migrations complete - starting app"
exec "$@"
