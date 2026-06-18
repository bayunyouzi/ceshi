FROM node:18-bullseye-slim AS base

# 1. Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install system dependencies required for Prisma and native modules
RUN apt-get update -y && apt-get install -y openssl ca-certificates

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install

# 2. Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage (postinstall already ran prisma generate)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create SQLite database in builder so runtime can boot without external database
ENV DATABASE_URL="file:/app/prisma/dev.db"
RUN npx prisma db push

# Seed default configs (ADMIN_EMAILS, API keys, etc.)
RUN node scripts/seed-config.js

# Ensure public directory exists
RUN mkdir -p public

# Build Next.js (standalone output generates minimal server bundle)
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# 3. Production image - minimal footprint
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Install only runtime system dependencies
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output (includes trimmed node_modules with only runtime deps)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma schema + generated client engines (not full node_modules)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy utility scripts for runtime
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Copy SQLite database template
RUN mkdir -p prisma-template
COPY --from=builder --chown=nextjs:nodejs /app/prisma/dev.db ./prisma-template/dev.db

USER nextjs

EXPOSE 3000

# Always use bundled SQLite at runtime, ensure schema + default configs exist
CMD ["sh", "-c", "export DATABASE_URL=file:/app/prisma/dev.db && if [ ! -f ./prisma/dev.db ]; then cp ./prisma-template/dev.db ./prisma/dev.db; fi && node scripts/migrate.js && node server.js"]
