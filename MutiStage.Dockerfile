# ---- Base Node ----
  FROM node:22-alpine AS base
  WORKDIR /app
  ENV PNPM_VERSION=10.19.0
  RUN npm i -g pnpm@$PNPM_VERSION

# ---- Dependencies ----
FROM base AS deps
# Install build tools and SQLite development libraries for native modules
RUN apk add --no-cache python3 make g++ gcc sqlite-dev
COPY package.json pnpm-lock.yaml* prisma.config.ts ./
COPY prisma ./prisma/
RUN pnpm install --frozen-lockfile

# Rebuild native modules for Alpine Linux
RUN npm rebuild better-sqlite3

# Generate Prisma client during deps stage (schema available here)
RUN npx prisma generate

  # ---- Build ----
  FROM deps AS builder
  RUN apk add --no-cache python3 make g++ gcc sqlite-dev
  RUN pnpm add -D tailwindcss
  COPY . .
  ENV NODE_ENV=production
  RUN pnpm build

  # ---- Production ----
  FROM node:22-alpine AS production
  WORKDIR /app

  # Install runtime dependencies only
  ENV PNPM_VERSION=10.19.0
  RUN npm i -g pnpm@$PNPM_VERSION

  COPY package.json pnpm-lock.yaml* prisma.config.ts ./
  COPY prisma ./prisma/
  RUN pnpm install --prod --frozen-lockfile

  # Copy built application AND generated Prisma client
  COPY --from=builder /app/.output ./.output
  COPY --from=deps /app/prisma/generated ./prisma/generated
  COPY entrypoint.sh .

  RUN chmod +x /app/entrypoint.sh
  EXPOSE 3000

  ENTRYPOINT ["/app/entrypoint.sh"]
  CMD ["node", ".output/server/index.mjs"]
