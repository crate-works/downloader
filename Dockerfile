# Stage 1: Install dependencies
FROM node:22-alpine AS deps

# Enable corepack for pnpm
RUN corepack enable

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including dev for build)
RUN pnpm install --frozen-lockfile

# Stage 2: Build the application
FROM node:22-alpine AS builder

RUN corepack enable

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY src ./src
COPY public ./public

# Build with a placeholder base path; docker-entrypoint.sh rewrites the
# token to the runtime BASE_PATH env var at container start
ENV NITRO_APP_BASE_URL=/__BASE_PATH__/

# Build the application
RUN pnpm build

# Stage 3: Production image
FROM node:22-alpine AS production

RUN corepack enable

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 appuser

# Copy package files for production install
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder stage; owned by appuser so the
# entrypoint can substitute the base path token at startup
COPY --from=builder --chown=appuser:nodejs /app/.output ./.output

COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# Switch to non-root user
USER appuser

# Expose the application port (Nitro reads PORT at startup; without this it
# would listen on its own default of 3000, contradicting EXPOSE and the healthcheck)
ENV PORT=7000
EXPOSE 7000

# Health check (normalises BASE_PATH the same way the entrypoint does)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD p="${BASE_PATH:-}"; p="/${p#/}"; p="${p%/}/"; wget --no-verbose --tries=1 --spider "http://localhost:7000${p}" || exit 1

# Start the application
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]
