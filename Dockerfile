# ---- Base Node ----
FROM node:22-alpine AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps

# Install pnpm and build tools for native modules
ENV PNPM_VERSION=10.19.0
RUN npm i -g pnpm@$PNPM_VERSION
RUN apk add --no-cache python3 make g++

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.json* prisma.config.ts ./
COPY prisma ./prisma/


# Install **all** dependencies (dev + prod)
RUN pnpm install

# Generate Prisma client **once** during build
RUN npx prisma generate

# Install Tailwind CSS as a dev dependency for the build
RUN pnpm add -D tailwindcss

# ---- Builder ----
FROM base AS builder
WORKDIR /app

# Install pnpm and build tools for native modules
RUN npm i -g pnpm@$PNPM_VERSION
RUN apk add --no-cache python3 make g++

# Copy dependencies and prisma schema
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Rebuild native modules for the current platform
RUN pnpm rebuild

# Use KEY=VALUE format for ENV
ENV NODE_ENV=production

# Prepare Nuxt types and .nuxt directory (including .nuxt/tsconfig.json)
RUN npx nuxt prepare

# Build the Nuxt application
RUN pnpm run build

# ---- Runner ----
FROM base AS runner
WORKDIR /app

# Use KEY=VALUE format for ENV
ENV NODE_ENV=production
ENV HOST=0.0.0.0

# Copy built output, prisma schema, and package.json/lock
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.json* ./

# Copy the generated Prisma client from the deps stage
COPY --from=deps /app/prisma/generated ./prisma/generated



# Copy and set up entrypoint script
COPY entrypoint.sh .
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000

# Set the entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]

# Default command passed to the entrypoint
CMD ["node", ".output/server/index.mjs"]
