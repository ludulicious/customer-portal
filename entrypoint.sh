set -e

# Run Prisma DB migrate deploy. Requires DATABASE_URL to be set.
echo "Running Prisma DB migrate deploy..."
npx prisma migrate deploy

# Execute the command passed as arguments to this script (which is the CMD from Dockerfile)
echo "Starting Nuxt server..."
exec "$@"
