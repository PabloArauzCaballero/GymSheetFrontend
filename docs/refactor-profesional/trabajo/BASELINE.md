# Baseline — punto de partida (Fase 00)

## Entorno de esta máquina

| Herramienta | Versión declarada | Versión ejecutada | Fuente |
|---|---|---|---|
| Node | `>=20 <24` (`engines`) | `v22.23.1` | `node -v` |
| Yarn | `yarn@1.22.22` (Yarn 1, Workspaces) | `1.22.22` | `yarn -v` |
| Turbo | `^2.3.0` | `2.10.6` (según log de ejecución) | log de `turbo run` |
| Next.js | `16.2.0` | No arrancado en esta pasada | `apps/web/package.json` |

## Checks ejecutados realmente

**Comando:** `yarn turbo run source-check type-check lint --filter=!@gymsheet/mobile`
**Fecha:** 2026-09-21. **Rama:** `dev`, con el árbol de trabajo tal cual está (cambios sin
commitear incluidos, ver CONTEXTO_REAL.md).
**Resultado:** ✅ **21/21 tareas exitosas** en 11 paquetes (`api-client, auth, design-tokens,
domain, hooks, notifications, observability, schemas, tsconfig, types, web`). Sin caché: 3
paquetes (`@gymsheet/web` en las tres tareas); resto con hit de caché de una corrida previa
equivalente. Tiempo total: 5m47s. `@gymsheet/web:source-check` → "Source check passed." (incluye
el límite de 300 líneas/archivo). `@gymsheet/web:lint` y `@gymsheet/web:type-check` sin errores.

**No ejecutado en esta pasada** (estado válido, no se reporta como aprobado):
- `yarn workspace @gymsheet/web test` (Vitest) — no corrido; se sabe por memoria de proyecto que
  a fecha 2026-09-14 pasaban 195 pruebas, pero el árbol cambió desde entonces (moderación,
  auditoría, sistema) y no hay evidencia fresca.
- `yarn workspace @gymsheet/web build` — no corrido.
- `yarn workspace @gymsheet/web test:e2e` (Playwright) — requiere backend + PostgreSQL activos;
  no se levantó ninguno de los dos en esta pasada.
- Arranque real (`next dev`/`next start`) y navegación en navegador — no ejecutado. Sin esto no
  hay capturas de escritorio/móvil ni medición de carga/interacción real para esta pasada.
- `yarn workspace @gymsheet/mobile type-check` — no ejecutado (mobile fuera de esta primera
  pasada por decisión del usuario, 2026-09-21).

## Defectos preexistentes conocidos (de fuentes previas, no reproducidos aquí)

De `docs/current-system-audit.md` (auditoría anterior, no fechada con precisión pero previa a
esta pasada):
- Licencia de Gym Visual pendiente de aprobar antes de importar multimedia externa.
- OpenAPI principal no cubre todos los controladores operativos.
- En una máquina anterior, Docker Desktop no arrancaba y bloqueaba migraciones/seeds/E2E — la
  memoria de proyecto (`gymsheet-web-local-run.md`) indica que en esta máquina **Docker sí
  corre** (verificado 2026-09-14), así que este bloqueo concreto puede no aplicar ya; se marca
  como "desconocido, a reconfirmar" en vez de asumir que sigue vigente.

De memoria de proyecto (`gymsheet-apple-premium-redesign.md`):
- Fase 6 de ADR-0003 (barrido decorativo del resto de pantallas) **parcial** — quedan pantallas
  sin pasar.
- View Transitions API aplazada a propósito (necesita QA en navegador real).
- QA visual en navegador de todo lo hecho hasta ahora, pendiente.

De memoria de proyecto (`gymsheet-admin-portal-plan.md`), pendiente de F4 (moderación):
- Falta poder reportar mensajes de chat y stories/fotos desde su propio visor; hoy el botón solo
  existe en `/perfil/[userId]`.

Ninguno de estos se reprodujo en esta pasada; se listan como antecedente para no confundirlos
con una regresión introducida por este encargo.

## Por qué no se levantó la app en esta pasada

Arrancar de verdad implica backend + PostgreSQL (ver `docs/current-system-audit.md` y la regla
de `CLAUDE.md`: "No afirmar E2E sin backend y PostgreSQL activos"), y la memoria de proyecto
documenta que el stack Docker que suele quedar corriendo en esta máquina apunta a una base de
datos remota (Neon) y sirve código desactualizado — arrancar "desde fuente" es el camino
correcto pero no trivial (dos repos, puertos, variables). Se prioriza dejar cerrada la Fase 00
documental con evidencia estática + checks de calidad reales, y mover el arranque completo
(capturas, medición, recorrido de las tres tareas candidatas) al primer incremento de fase 01,
una vez resuelta la decisión pendiente en PLAN_SITUADO.md.
