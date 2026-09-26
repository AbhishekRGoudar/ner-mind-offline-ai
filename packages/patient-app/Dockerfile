# Multi-stage Dockerfile for @ner-mind/patient-app
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root manifest and workspaces
COPY package*.json ./
COPY packages/core/package*.json ./packages/core/
COPY packages/server/package*.json ./packages/server/
COPY packages/patient-app/package*.json ./packages/patient-app/

RUN npm ci

# Copy source trees
COPY packages/core ./packages/core
COPY packages/patient-app ./packages/patient-app

# Build core and patient-app
RUN npm run build --workspace=@ner-mind/core
RUN npm run build --workspace=@ner-mind/patient-app

# Production NGINX web server
FROM nginx:1.27-alpine AS runner

# Copy custom NGINX configuration
COPY packages/patient-app/nginx.conf /etc/nginx/conf.d/default.conf

# Copy production static build artifacts from builder
COPY --from=builder /app/packages/patient-app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
