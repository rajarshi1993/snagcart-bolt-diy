# ---- build stage ----
FROM node:22-bookworm-slim AS build
WORKDIR /app

# CI-friendly env
ENV HUSKY=0
ENV CI=true

# Use pnpm
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Ensure git is available for build scripts and ca-certificates are present so
# workerd's outbound TLS (e.g. fetches to OpenAI from the chat API route) can
# verify peer certs. node:bookworm-slim ships with NO CA bundle, which makes
# `wrangler pages dev` fetches fail with "unable to get local issuer
# certificate". Installed here in the base build stage so every stage inherits
# /etc/ssl/certs/ca-certificates.crt.
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
  && update-ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Accept (optional) build-time public URL for Remix/Vite
ARG VITE_PUBLIC_APP_URL
ENV VITE_PUBLIC_APP_URL=${VITE_PUBLIC_APP_URL}

# Install deps efficiently
COPY package.json pnpm-lock.yaml* ./
RUN pnpm fetch

# Copy source and build
COPY . .
RUN pnpm install --offline --frozen-lockfile

# Build the Remix app (SSR + client bundles)
RUN NODE_OPTIONS=--max-old-space-size=4096 pnpm run build


# ---- development stage ----
FROM build AS development

ARG VITE_LOG_LEVEL=debug
ARG DEFAULT_NUM_CTX
ENV VITE_LOG_LEVEL=${VITE_LOG_LEVEL} \
    DEFAULT_NUM_CTX=${DEFAULT_NUM_CTX} \
    RUNNING_IN_DOCKER=true

RUN mkdir -p /app/run
CMD ["pnpm", "run", "dev", "--host"]


# ---- production stage ----
# Based on the build stage so we keep the full dependency tree (incl. wrangler),
# the compiled Remix server build, the Cloudflare Pages functions, bindings.sh
# and wrangler.toml. bolt.diy's entry.server targets the Cloudflare/workerd
# runtime (renderToReadableStream), so it must be served via `wrangler pages dev`
# — a plain Node server cannot execute the SSR build.
#
# Kept LAST so it is the default build target: Railway (and `docker build` with
# no --target) builds the final stage, so the platform deploys production by
# default instead of the dev server.
FROM build AS bolt-ai-production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5173
ENV HOST=0.0.0.0
ENV WRANGLER_SEND_METRICS=false
ENV RUNNING_IN_DOCKER=true

# curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

# Disable wrangler telemetry prompt and make the bindings script executable
RUN mkdir -p /root/.config/.wrangler \
  && echo '{"enabled":false}' > /root/.config/.wrangler/metrics.json \
  && chmod +x /app/bindings.sh

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=5 \
  CMD curl -fsS "http://localhost:${PORT:-5173}/" || exit 1

CMD ["pnpm", "run", "dockerstart"]
