# =============================================================================
# SDAC AI Widget - Docker Build
# Multi-stage build for optimized production image
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build arguments for Vite (client-side env vars must be set at build time)
ARG VITE_REPORT_ID=""
ARG VITE_DEMO_USER_ID="demo-user"
ARG VITE_DEMO_USER_NAME="Demo User"
ARG VITE_DEMO_USER_EMAIL="demo@example.com"
ARG VITE_DEMO_USER_ROLE="District Admin"
ARG VITE_DEMO_DISTRICT="Demo District"
ARG VITE_MASTRA_AGENT_ID=""

# Set environment variables for build
ENV VITE_REPORT_ID=$VITE_REPORT_ID
ENV VITE_DEMO_USER_ID=$VITE_DEMO_USER_ID
ENV VITE_DEMO_USER_NAME=$VITE_DEMO_USER_NAME
ENV VITE_DEMO_USER_EMAIL=$VITE_DEMO_USER_EMAIL
ENV VITE_DEMO_USER_ROLE=$VITE_DEMO_USER_ROLE
ENV VITE_DEMO_DISTRICT=$VITE_DEMO_DISTRICT
ENV VITE_MASTRA_AGENT_ID=$VITE_MASTRA_AGENT_ID

# Build the application (client + server)
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Production
# -----------------------------------------------------------------------------
FROM node:22-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package.json package-lock.json* ./

# Install only production dependencies
# Using npm install instead of npm ci to handle optional dependencies better
RUN npm install --omit=dev && npm cache clean --force

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Environment variables (can be overridden at runtime)
ENV NODE_ENV=production
ENV PORT=5000

# Expose the port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start the application
CMD ["node", "dist/index.cjs"]
