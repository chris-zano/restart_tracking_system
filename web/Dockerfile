# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:22-alpine AS deps

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Enable pnpm via corepack (ships with Node 22)
RUN corepack enable pnpm && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable pnpm && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Ensure public/ exists so the COPY in the runner stage never fails
RUN mkdir -p public

RUN pnpm build

# ── Stage 3: production runner ────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy only the standalone bundle and static assets produced by `output: standalone`
COPY --from=builder /app/public                        ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# server.js is emitted by Next.js standalone output
CMD ["node", "server.js"]
