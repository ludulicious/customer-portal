# #!/bin/sh
# # Wait for DB to be ready (simple health check)
# until PGPASSWORD=$POSTGRES_PASSWORD psql -h "db" -U "postgres" -d "myapp" -c '\q'; do
#   >&2 echo "Postgres is unavailable - sleeping"
#   sleep 1
# done

>&2 echo "Running migrations"
npx prisma migrate deploy --schema=/app/prisma/schema.prisma
npx prisma generate --schema=/app/prisma/schema.prisma

>&2 echo "Migrations complete - starting app"
exec "$@"
