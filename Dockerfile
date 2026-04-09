# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 – deps
# Install production dependencies in isolation so layer is cached separately.
# ─────────────────────────────────────────────────────────────────────────────
FROM oven/bun:1 AS deps

WORKDIR /app

# Copy only the files bun needs to resolve the lockfile
COPY package.json bun.lock ./

# Install deps (devDeps excluded in prod install)
RUN bun install --frozen-lockfile --production


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 – runtime
# Lean final image: copies source, data assets, and the installed node_modules.
# ─────────────────────────────────────────────────────────────────────────────
FROM oven/bun:1-distroless AS runtime

WORKDIR /app

# ── Dependencies (from deps stage) ──────────────────────────────────────────
COPY --from=deps /app/node_modules ./node_modules

# ── Application source ───────────────────────────────────────────────────────
COPY app.ts        ./
COPY tsconfig.json ./
COPY src/          ./src/

# ── Data assets (CSV data files) ─────────────────────────────────────────────
COPY attendance_reports/      ./attendance_reports/
COPY class_list/              ./class_list/
COPY learner_progess_reports/ ./learner_progess_reports/
COPY weekly_targets/          ./weekly_targets/

# ── Runtime config ───────────────────────────────────────────────────────────
ENV NODE_ENV=production
EXPOSE 3000

# Start the HTTP server
ENTRYPOINT ["bun", "run", "app.ts", "serve"]
