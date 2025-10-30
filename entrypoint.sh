#!/bin/sh
set -e

# Wait for database to be ready
echo "Waiting for database to be ready..."
timeout=60
while ! nc -z ${DB_HOST:-localhost} ${DB_PORT:-5432} 2>/dev/null; do
  if [ $timeout -le 0 ]; then
    echo "Database connection timeout"
    exit 1
  fi
  echo "Waiting for database... ($timeout seconds remaining)"
  sleep 2
  timeout=$((timeout - 2))
done

echo "Database is ready!"

# Run Drizzle migrations
echo "Running Drizzle migrations..."
if ! npx drizzle-kit migrate --config drizzle.config.ts; then
  echo "Migration failed!"
  exit 1
fi
# Execute the command passed as arguments to this script (which is the CMD from Dockerfile)
echo "Starting Nuxt server..."
exec "$@"
