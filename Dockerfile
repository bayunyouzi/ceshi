FROM node:18-bullseye-slim AS base

# 1. Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install system dependencies required for Prisma and native modules
RUN apt-get update -y && apt-get install -y openssl ca-certificates

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
# Copy Prisma schema before npm install to allow prisma generate to run
COPY prisma ./prisma
RUN npm install

# 2. Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client (using native target)
RUN npx prisma generate

# Create SQLite database in builder so runtime can boot without external database
ENV DATABASE_URL="file:/app/prisma/dev.db"
RUN npx prisma db push

# Ensure public directory exists (to prevent COPY failure later)
RUN mkdir -p public

# Build Next.js
# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# 3. Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Install runtime dependencies
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Ensure public directory exists
RUN mkdir -p public

# Copy necessary files
# Copy public assets (now guaranteed to exist in builder)
COPY --from=builder /app/public ./public

# Copy built application
# Next.js standalone output includes node_modules, so we don't need to copy them separately
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma/dev.db ./prisma/dev.db
RUN mkdir -p prisma-template
COPY --from=builder --chown=nextjs:nodejs /app/prisma/dev.db ./prisma-template/dev.db

# Copy Prisma schema and run migrations before starting
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000

# Always use bundled SQLite at runtime to avoid external DATABASE_URL conflicts.
# Do not run `prisma db push` on startup: the existing persistent database may contain
# historical columns/tables and Prisma will refuse destructive changes, causing crash loops.
CMD ["sh", "-c", "export DATABASE_URL=file:/app/prisma/dev.db && if [ ! -f ./prisma/dev.db ]; then cp ./prisma-template/dev.db ./prisma/dev.db; fi && node server.js"]
