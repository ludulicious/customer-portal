# ---- Base Node ----
FROM node:22-alpine AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS builder

# Install pnpm and build tools for native modules
ENV PNPM_VERSION=10.19.0
RUN npm i -g pnpm@$PNPM_VERSION
RUN apk add --no-cache python3 make g++

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.json* prisma.config.ts ./
COPY prisma ./prisma/

# Install **all** dependencies (dev + prod)
RUN pnpm install
RUN pnpm add -D tailwindcss
COPY . .

# Generate Prisma client **once** during build
RUN npx prisma generate

# Rebuild native modules for the target platform
RUN pnpm rebuild

RUN pnpm build

# ---- Runner ----
FROM base AS runner
WORKDIR /app

# Install runtime dependencies for better-sqlite3
RUN apk add --no-cache sqlite

# Use KEY=VALUE format for ENV
ENV NODE_ENV=production
ENV HOST=0.0.0.0

# Copy built output, prisma schema, and package.json/lock
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.json* ./

COPY --from=builder /app/prisma/generated ./prisma/generated

# Copy and set up entrypoint script
COPY entrypoint.sh .
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000

# Set the entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]

# Default command passed to the entrypoint
CMD ["node", ".output/server/index.mjs"]
