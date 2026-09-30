# ------------------------------------------------------------------------------
# Production Dockerfile for AI Resume Builder Backend API
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

# Create and define the application directory
WORKDIR /usr/src/app

# Install curl/wget for healthcheck
RUN apk add --no-cache curl

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies first (caching layer)
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source code
COPY server.js ./

# Security: run as unprivileged node user
USER node

# Expose internal API port
EXPOSE 5000

# Docker healthcheck targeting the production health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5000/api/v1/health || exit 1

# Launch production server
CMD ["node", "server.js"]
