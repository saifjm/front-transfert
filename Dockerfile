# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-bookworm AS builder

WORKDIR /app

ENV CI=true
ENV NPM_CONFIG_PROGRESS=false
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_FUND=false

COPY package*.json ./

RUN node -v && npm -v

RUN npm ci --include=optional --legacy-peer-deps --no-audit --no-fund

RUN node -e "require('@tailwindcss/oxide'); console.log('Tailwind oxide OK')"

COPY . .

RUN npm run build

# ─── Stage 2: Production ─────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf.template

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -q -O /dev/null http://localhost/ || exit 1

CMD envsubst '$API_URL' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && \
    nginx -g 'daemon off;'