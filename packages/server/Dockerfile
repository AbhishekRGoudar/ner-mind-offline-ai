# Multi-stage Dockerfile for @ner-mind/server
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
COPY packages/core/package*.json ./packages/core/
COPY packages/server/package*.json ./packages/server/
COPY packages/patient-app/package*.json ./packages/patient-app/

RUN npm ci

# Copy source trees
COPY packages/core ./packages/core
COPY packages/server ./packages/server

# Build core and server
RUN npm run build --workspace=@ner-mind/core
RUN npm run build --workspace=@ner-mind/server

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy root manifest and workspaces
COPY package*.json ./
COPY packages/core/package*.json ./packages/core/
COPY packages/server/package*.json ./packages/server/

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compiled artifacts from builder
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/server/src/db/schema.sql ./packages/server/dist/db/schema.sql

EXPOSE 4000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD curl -f http://localhost:4000/health || exit 1

CMD ["node", "packages/server/dist/server.js"]
