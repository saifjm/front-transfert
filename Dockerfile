# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./

# --legacy-peer-deps requis pour Tailwind v4 + dépendances Radix UI
RUN npm ci --legacy-peer-deps

COPY . .

# TypeScript compile + Vite bundle → dist/
RUN npm run build

# ─── Stage 2: Production (nginx) ─────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

RUN rm /etc/nginx/conf.d/default.conf

# nginx.conf utilise $API_URL injecté via envsubst au démarrage
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# Copier le bundle Vite (outDir: dist)
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fs http://localhost/ || exit 1

CMD envsubst '$API_URL' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && \
    nginx -g 'daemon off;'
