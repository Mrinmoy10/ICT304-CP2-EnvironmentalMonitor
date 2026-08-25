# ============================================================
# Multi-stage build.
#
# Stage 1 compiles the React application with the full Node
# toolchain. Stage 2 copies only the static output into an Nginx
# image, so the shipped container carries no build tooling and no
# node_modules. This follows the host-target development model
# described in Capstone Project 1 section 3.3.
# ============================================================

# ---------- Stage 1: build ----------
FROM node:20-alpine AS build

WORKDIR /app

# Copy manifests first so Docker can cache the dependency layer:
# application changes then do not force a reinstall.
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ---------- Stage 2: serve ----------
FROM nginx:1.27-alpine AS runtime

LABEL org.opencontainers.image.title="Environmental Monitor — Front End"
LABEL org.opencontainers.image.description="Front-end prototype for the Cloud-Based Environmental Data Monitoring System (ICT304 Capstone Project 2)"
LABEL org.opencontainers.image.licenses="MIT"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Container restart policies depend on the orchestrator knowing the
# service is alive; this endpoint is what a health check probes.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
