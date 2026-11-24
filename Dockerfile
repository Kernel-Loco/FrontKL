# Portal de LowTide para el despliegue (#49, RC-91). Lo levanta BackKL con docker-compose.despliegue.yml.
# En desarrollo no hace falta: npm run dev (README.md).
#
# Compila con output standalone (next.config.ts lee NEXT_OUTPUT) y corre `node server.js` sin root.
# La primera construcción necesita internet: npm ci y las fuentes de Google Fonts (next/font).
#
# Base Debian 13 (trixie): la de Debian 12 (bookworm) trae zlib1g 1.2.13 con la crítica CVE-2023-45853, que Debian no
# va a arreglar ahí, y Trivy frena con cualquier crítica y sin excepciones (.github/workflows/imagenes.yml, RC-117).

FROM node:22.23.5-trixie-slim AS construir
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Destino de /api/v1 visto desde el servidor de Next. Los rewrites lo fijan al compilar.
ARG API_INTERNAL_URL=http://api:8000
ENV API_INTERNAL_URL=${API_INTERNAL_URL} \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22.23.5-trixie-slim
WORKDIR /app
# KEEP_ALIVE_TIMEOUT: Node cierra una conexión ociosa a los 5 s y cloudflared la reutiliza hasta 90 s. Un POST que
# cloudflared manda justo cuando Node la cierra no se reintenta y da 502. Con 95 s siempre la suelta cloudflared primero.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    KEEP_ALIVE_TIMEOUT=95000
# El usuario node (uid 1000) ya viene en la imagen.
COPY --from=construir --chown=node:node /app/.next/standalone ./
COPY --from=construir --chown=node:node /app/.next/static ./.next/static
COPY --from=construir --chown=node:node /app/public ./public
# PRUEBA DE RC-117, NO FUSIONAR: gosu de postgres:16.15 trae la crítica CVE-2025-68121. Trivy tiene que frenar.
COPY --from=postgres:16.15 /usr/local/bin/gosu /usr/local/bin/gosu-sembrado
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "server.js"]
