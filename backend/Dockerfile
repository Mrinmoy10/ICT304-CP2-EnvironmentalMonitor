# ============================================================
# Environmental Monitor — REST API image (multi-stage)
#   test    : full dependencies + test suite (used by `docker compose run api-test`)
#   runtime : production dependencies only, runs as the unprivileged "node" user
# ============================================================
FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS test
RUN npm ci
COPY . .
CMD ["npm", "test"]

FROM base AS runtime
ENV NODE_ENV=production
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src
COPY db ./db
COPY scripts ./scripts
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1
CMD ["node", "src/server.js"]
