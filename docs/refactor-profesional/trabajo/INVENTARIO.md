# Inventario — rutas, navegación y componentes

> Estado de inspección: **estático** (lectura de código y de `nav-config.ts`, que es la fuente
> única declarada del grid de `/admin` y de las tres navegaciones). Ningún recorrido en
> navegador se ejecutó en esta pasada; ver BASELINE.md.

## Navegación declarada (tres niveles, ya intencional — no es azar a corregir)

`apps/web/src/shared/components/layout/nav-config.ts` (198 líneas, con cambios sin commitear)
separa tres listas con razón documentada en el propio archivo:

1. **`primaryNavigation`** (13 ítems) — todo lo que ve un miembro de gimnasio: panel, senda
   (progreso), entrenamientos, planes, rutinas, ejercicios, comunidad, descubrir (swipe),
   interacciones, mensajes, membresía, acceso, avisos, perfil, centro de ayuda. El orden ya
   tiene justificación escrita inline (p. ej. "Tu senda" pegado al panel porque responde
   "¿me estoy acercando a como quiero verme?"; "Interacciones" pegada a Comunidad porque lleva
   el único badge numérico).
2. **`adminNavigation`** (11 ítems, `/admin/*`) — consola de un gimnasio: operaciones, usuarios,
   panel del gimnasio, equipamiento, catálogo global, instalaciones, clientes, registrar
   persona, control de acceso, moderación, permisos, auditoría. Gateado por `roles` (`ADMIN`,
   `FRONT_DESK`) y algunos además por `requiredPermission` (moderación, permisos, auditoría).
3. **`systemNavigation`** (2 ítems, `/sistema/*`) — consola de plataforma, deliberadamente
   separada de `adminNavigation` ("no es más administración: son gimnasios distintos" — cita
   del comentario en el código). Solo `SYSTEM_ADMIN`.

La función `canSee(item, role, permissions)` es la única puerta de visibilidad: rol primero,
permiso granular después, igual que el backend (`RolesGuard` → `PermissionGuard`). **Cualquier
propuesta de reorganización de IA (fase 02) debe partir de este modelo, no de una taxonomía
genérica de Atomic/SaaS** — ya está pensado por tarea y por audiencia (miembro / staff del
gimnasio / staff de plataforma).

## Inventario de rutas (`apps/web/src/app`)

Estado de inspección para todas: **estático**. Roles: los declarados en `nav-config.ts`;
`(auth)` y páginas públicas son de acceso libre; el resto de `(portal)` requiere sesión (capa
compartida por `packages/auth`, no verificada archivo a archivo en esta pasada).

| ID | Ruta | Grupo | Propósito (por nombre + nav) | Roles |
|---|---|---|---|---|
| ROUTE-001 | `/login`, `/register`, `/recover-password` | `(auth)` | Autenticación | Público |
| ROUTE-002 | `/activar/[token]` | `(portal)` | Activación de cuenta por token | Público con token |
| ROUTE-003 | `/dashboard` | `(portal)` | Panel principal del miembro | Miembro (modificado, sin commit) |
| ROUTE-004 | `/trayectoria` | `(portal)` | Progreso/senda personal | Miembro |
| ROUTE-005 | `/workouts`, `/workouts/[id]`, `/workouts/new` | `(portal)` | Sesiones de entrenamiento | Miembro |
| ROUTE-006 | `/plans` | `(portal)` | Planes de entrenamiento | Miembro |
| ROUTE-007 | `/routines`, `/routines/[id]` | `(portal)` | Rutinas | Miembro |
| ROUTE-008 | `/exercises`, `/exercises/[id]`, `/exercises/[id]/edit`, `/exercises/new` | `(portal)` | Catálogo de ejercicios propio | Miembro |
| ROUTE-009 | `/comunidad` | `(portal)` | Comunidad | Miembro |
| ROUTE-010 | `/descubrir` | `(portal)` | Descubrimiento tipo swipe | Miembro |
| ROUTE-011 | `/interacciones` | `(portal)` | Likes/vistas/next (badge numérico) | Miembro |
| ROUTE-012 | `/chat`, `/chat/[id]` | `(portal)` | Mensajería | Miembro |
| ROUTE-013 | `/membership` | `(portal)` | Membresía propia | Miembro |
| ROUTE-014 | `/access` | `(portal)` | Acceso físico propio | Miembro |
| ROUTE-015 | `/notifications` | `(portal)` | Avisos | Miembro |
| ROUTE-016 | `/profile`, `/perfil`, `/perfil/[userId]` | `(portal)` | Perfil propio y ajeno | Miembro |
| ROUTE-017 | `/tutorials` | `(portal)` | Centro de ayuda | Miembro |
| ROUTE-018 | `/onboarding` | `(portal)` | Alta guiada | Miembro nuevo |
| ROUTE-019 | `/admin`, `/admin/usuarios`, `/admin/operacion`, `/admin/equipment`, `/admin/exercises`, `/admin/facilities`, `/admin/membership`, `/admin/people`, `/admin/access` | `(portal)/admin` | Consola de gimnasio | `ADMIN`, `FRONT_DESK` (varias vistas modificadas/sin commit) |
| ROUTE-020 | `/admin/moderacion` **(sin trackear)** | `(portal)/admin` | Cola de moderación | `ADMIN`/`FRONT_DESK` + `moderation:read` |
| ROUTE-021 | `/admin/permissions` | `(portal)/admin` | Grant/revoke de permisos granulares | `ADMIN`/`FRONT_DESK` + `admin-access:manage` |
| ROUTE-022 | `/admin/auditoria` **(sin trackear)** | `(portal)/admin` | Auditoría de un gimnasio | `ADMIN`/`FRONT_DESK` + `admin-access:manage` |
| ROUTE-023 | `/sistema` **(sin trackear)** | `(portal)/sistema` | Consola de plataforma | `SYSTEM_ADMIN` |
| ROUTE-024 | `/sistema/auditoria` **(sin trackear)** | `(portal)/sistema` | Auditoría global de plataforma | `SYSTEM_ADMIN` |
| ROUTE-025 | `/gimnasios`, `/gimnasios/[id]` | pública | Directorio público de gimnasios | Público |
| ROUTE-026 | `/privacidad`, `/terminos` | pública | Legal | Público |
| ROUTE-027 | `/api/auth/*`, `/api/backend/[...path]`, `/api/health`, `/api/media` | BFF | Autenticación, proxy al backend, salud, medios firmados | N/A (server) |

No se detectaron a simple vista rutas huérfanas (toda ruta bajo `(portal)` aparece referenciada
en alguna de las tres navegaciones o es alcanzable desde ellas) ni duplicados obvios entre
`/profile` y `/perfil` más allá de lo esperable (uno es "mi perfil", el otro "perfil de
[userId]"); **confirmar en fase 01 con un recorrido real**, esto es lectura de nombres de
carpeta, no navegación ejecutada.

## Componentes compartidos (`apps/web/src/shared/components`)

| Carpeta | Contenido observado |
|---|---|
| `ui/` | Primitivas (button, input, checkbox, badge, card, tabs, metric-card, empty-state, page-header, etc.) — según memoria de proyecto, ya pasadas por ADR-0003 (sin sheen/glow/orbe) |
| `layout/` | `nav-config.ts`, `portal-shell.tsx` (shell con navegación; **modificado, sin commit**) |
| `feedback/` | Componentes de estado (toasts/alerts — no auditado línea a línea aquí) |
| `media/` | Imagen/vídeo, probablemente el visor que falta para reportar contenido (pendiente según memoria de F4 de moderación) |
| `motion/` | Envolturas de animación (candidato natural para fases/07) |
| `background/` | Fondo ambiental (mencionado en memoria como "ambient calmado" tras ADR-0003) |

## Módulos de producto (`apps/web/src/features`, 19 carpetas)

`access, admin, auth, chat, dashboard, exercises, interactions, membership, moderation, notifications, onboarding, profile, progression, public-facilities, social, stories, training, tutorials, workouts`

Arquitectura ya modular por funcionalidad (coincide con el criterio "módulos por
funcionalidad" del PROMPT_MAESTRO). `moderation/` es nueva y sin commitear.

## Paquetes compartidos (`packages/*`, fuente única con la app móvil)

`types, schemas, api-client, domain, auth, hooks, notifications, design-tokens, observability,
tsconfig`. **No importan desde `apps/*`** (regla explícita en `CLAUDE.md`) — cualquier cambio de
arquitectura (fase 04) que toque estos paquetes afecta también a `apps/mobile`, fuera del
alcance principal de este encargo.

## Documentación de diseño ya existente (no es un punto de partida vacío)

- `docs/decisions/ADR-0001-bff-http-only-session.md` — sesión.
- `docs/decisions/ADR-0002-dual-theme-token-system.md` — tokens dual-theme, ya el sistema que
  fases/03 pediría crear.
- `docs/decisions/ADR-0003-apple-premium-visual-direction.md` — dirección visual Apple-premium,
  con regla del acento y motion tokenizado. Fases 0-5 dadas por hechas y verificadas en memoria
  de proyecto (2026-09-10); fase 6 (barrido de pantallas) parcial.
- `docs/ui/design-system.md`, `docs/ui/ui-ux-source-traceability.md`, `docs/ui/reference/*` —
  referencias visuales previas (capturas "Stitch", trazabilidad UX/UI).
- `docs/current-system-audit.md` — auditoría previa (arquitectura, hallazgos ya corregidos,
  riesgos abiertos: licencia Gym Visual, cobertura de OpenAPI, Docker Desktop bloqueado en una
  máquina anterior).
