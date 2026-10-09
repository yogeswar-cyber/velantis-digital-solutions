# =================================================================
# VELANTIS DIGITAL SOLUTIONS — Multi-Stage Production Dockerfile
# =================================================================

# -----------------------------------------------------------------
# Stage 1: Frontend Build Environment
# -----------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build static bundle
COPY . .
RUN npm run build

# -----------------------------------------------------------------
# Stage 2: Production Runtime Environment
# -----------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy Prisma schema and generate client for production PostgreSQL
COPY prisma ./prisma
RUN npx prisma generate --schema=prisma/schema.postgresql.prisma

# Copy built frontend assets from builder stage
COPY --from=builder /app/dist ./dist

# Copy backend application source code
COPY server ./server

# Create uploads directory with appropriate permissions
RUN mkdir -p uploads/projects && chown -R node:node /app

# Switch to non-root user for security
USER node

EXPOSE 5000

# Health check probing the /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "server/src/server.js"]
