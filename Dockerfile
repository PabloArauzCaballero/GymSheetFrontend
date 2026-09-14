# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# Imagen de producción para @gymsheet/web (Next.js 16, output: 'standalone').
#
# Es un monorepo Yarn Workspaces + Turborepo: construir la web requiere los
# paquetes `@gymsheet/*` del root, por eso el contexto de build es la RAÍZ del
# repo (no apps/web). Se usa `turbo prune` para aislar solo el subgrafo que la
# web necesita y aprovechar el cacheo de capas por manifiestos.
# ---------------------------------------------------------------------------

FROM node:22-alpine AS base
# libc6-compat: binarios nativos (SWC de Next, oxide de Tailwind v4) sobre musl.
RUN apk add --no-cache libc6-compat
RUN corepack enable
WORKDIR /app

# ---- Prune: deja solo lo que @gymsheet/web necesita ----
FROM base AS pruner
RUN yarn global add turbo@^2
COPY . .
RUN turbo prune @gymsheet/web --docker

# ---- Install: capa cacheable por manifiestos (out/json) ----
FROM base AS installer
COPY --from=pruner /app/out/json/ ./
# turbo prune --docker no incluye scripts/ del root; el postinstall del
# package.json raíz (dedupe-react.mjs) lo necesita durante este mismo yarn install.
COPY --from=pruner /app/scripts ./scripts
RUN yarn install --frozen-lockfile --network-timeout 600000

# ---- Build: código completo del subgrafo + compilación de la web ----
COPY --from=pruner /app/out/full/ ./
# turbo prune no incluye configs sueltas del root; tsconfig.base.json es la base
# de la que heredan los tsconfig de cada paquete (extends: "../../tsconfig.base.json").
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json
# NEXT_PUBLIC_* se inlinea en el bundle del navegador durante el build, no en
# runtime: por eso llega como build arg y no como `environment:` del compose.
ARG NEXT_PUBLIC_BACKEND_ORIGIN=http://localhost:3001
ENV NEXT_PUBLIC_BACKEND_ORIGIN=$NEXT_PUBLIC_BACKEND_ORIGIN
RUN yarn turbo run build --filter=@gymsheet/web

# ---- Runner: imagen final mínima con el standalone ----
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# El standalone del monorepo ubica el server en apps/web/server.js y hoistea
# node_modules en la raíz. static/ se copia aparte (no va en el trace). La
# mayoría de assets (brand-mark.svg, manifest.ts) son rutas de archivo
# especiales de app/ y ya viajan en el standalone; public/ se copia aparte
# porque el standalone tampoco lo incluye, y ahí vive sw.js: un service worker
# SÓLO controla todo el origen si se sirve desde la raíz, así que no puede ser
# una ruta de app/.
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3001
ENV PORT=3001
# HOSTNAME=0.0.0.0 para aceptar conexiones desde fuera del contenedor.
ENV HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
