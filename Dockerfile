# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build production assets
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Set production environment
ENV NODE_ENV=production
ENV PORT=3001

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S stockticker -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=stockticker:nodejs /app/build ./build
COPY --from=builder --chown=stockticker:nodejs /app/public ./public

# Copy server files
COPY --chown=stockticker:nodejs server.js ./
COPY --chown=stockticker:nodejs server-production.js ./

# Copy environment template (should be replaced in deployment)
COPY --chown=stockticker:nodejs .env.production.template ./.env

# Create logs directory
RUN mkdir -p /app/logs && chown stockticker:nodejs /app/logs

# Switch to non-root user
USER stockticker

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/status/health || exit 1

# Start production server with enhanced reliability
CMD ["node", "server-production.js"]