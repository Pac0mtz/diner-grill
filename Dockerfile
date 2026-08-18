FROM node:22-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates python3 make g++ \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g npm@11.18.0

COPY package.json package-lock.json ./
RUN sed -i 's|http://package-firewall.replit.local/npm|https://registry.npmjs.org|g' package-lock.json \
    && sed -i 's|https://package-firewall.replit.local/npm|https://registry.npmjs.org|g' package-lock.json \
    && npm ci --include=dev --no-audit --no-fund

COPY . .
# sharp is a devDependency but the admin photo-upload path imports it at runtime.
RUN npm run build \
    && npm prune --omit=dev \
    && npm install --omit=dev --no-save --no-audit --no-fund sharp@0.35.3

FROM node:22-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app /app

ENV NODE_ENV=production
ENV PORT=5000
ENV HOST=0.0.0.0
EXPOSE 5000
CMD ["node", "server/index.js"]
