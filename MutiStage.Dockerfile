# ---- Base Node ----
  FROM node:22-alpine AS base
  WORKDIR /app
  ENV PNPM_VERSION=10.19.0
  RUN npm i -g pnpm@$PNPM_VERSION

# ---- Dependencies ----
FROM base AS deps
# Install build tools and SQLite development libraries for native modules
RUN apk add --no-cache python3 make g++ gcc sqlite-dev
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Rebuild native modules for Alpine Linux
RUN npm rebuild better-sqlite3

  # ---- Build ----
  FROM deps AS builder
  RUN apk add --no-cache python3 make g++ gcc sqlite-dev
  RUN pnpm add -D tailwindcss
  COPY . .
  # Generate and apply Drizzle migrations (no-op if up-to-date)
  RUN pnpm dlx drizzle-kit generate || true
  RUN pnpm dlx drizzle-kit migrate || true
  ENV NODE_ENV=production
  RUN pnpm build

  # ---- Production ----
  FROM node:22-alpine AS production
  WORKDIR /app

  # Install runtime dependencies only
  ENV PNPM_VERSION=10.19.0
  RUN npm i -g pnpm@$PNPM_VERSION

  COPY package.json pnpm-lock.yaml* ./
  RUN pnpm install --prod --frozen-lockfile

  # Copy built application
  COPY --from=builder /app/.output ./.output
  COPY entrypoint.sh .

  RUN chmod +x /app/entrypoint.sh
  EXPOSE 3000

  ENTRYPOINT ["/app/entrypoint.sh"]
  CMD ["node", ".output/server/index.mjs"]
