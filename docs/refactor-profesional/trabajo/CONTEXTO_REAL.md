# Contexto real — GymSheet Frontend (apps/web)

> Fase 00. Fuente: inspección estática del checkout en `dev` el 2026-09-21. No se ejecutó
> navegador ni backend en esta pasada (ver BASELINE.md para el detalle de qué sí se corrió).

## Producto

| Dato | Contenido | Fuente | Confianza |
|---|---|---|---|
| Nombre observado | GymSheet | `package.json`, `CLAUDE.md` | Observado |
| Propósito | Plataforma de gestión de gimnasios: entrenamiento (rutinas, ejercicios, sesiones guiadas), membresía y acceso, vida social (comunidad, chat, stories), y una consola de administración multi-tenant (personas, permisos, moderación, auditoría, operación) | Rutas de `apps/web/src/app`, `docs/current-system-audit.md`, `docs/plan/PLAN-ADMIN-PORTAL-V2.md` | Observado |
| Naturaleza | Mixta: trabajo recurrente (entrenar, registrar sesiones) + transaccional (membresía, acceso) + zona informativa/social (comunidad, perfiles) + consola operativa (`/admin`, `/sistema`) | Inventario de rutas | Observado |
| Usuarios/roles conocidos | Enum de roles en `packages/types` (staff: `SYSTEM_ADMIN`, `ADMIN`, y roles operativos como `FRONT_DESK`; miembros de gimnasio). Multi-tenant: cada gimnasio (`tenant`) es un espacio aislado | `packages/domain/src/permissions.ts`, `packages/types/src/enums.ts` (ambos con cambios sin commitear en este checkout), memoria de proyecto | Observado, con cambios en curso no confirmados en disco todavía auditados línea a línea |
| Datos sensibles | PII de personas (nombre, correo, teléfono) en membresía/admin; multimedia de usuario (fotos/vídeo en stories, ejercicios); JWT de sesión (cookie HttpOnly); permisos RBAC granulares | `docs/decisions/ADR-0001-bff-http-only-session.md`, `GymInsightsService`, admin panels | Observado |
| Idiomas | UI en español (rutas, copy) | Nombres de ruta (`/perfil`, `/trayectoria`, `/comunidad`) | Observado |
| Dispositivos | Web responsive (Tailwind) + contraparte móvil nativa (`apps/mobile`, Expo) que comparte lógica vía `packages/*` | `CLAUDE.md` raíz y del frontend | Observado |
| Alcance de este encargo | `apps/web` (Next.js 16, App Router) **primero**; `apps/mobile` (Expo/React Native) queda para una segunda pasada explícita una vez cerrado el web. Cualquier cambio a `packages/*` (fuente compartida) debe evaluarse igual contra ambas apps aunque mobile no se toque todavía, porque mobile los consume sin re-exportar | Confirmado por el usuario 2026-09-21 | Decisión de alcance |

## Restricciones del encargo (heredadas del repo, no inventadas por el kit)

- No mezclar mocks con runtime.
- No tokens en Web Storage; sesión web vía cookie HttpOnly (BFF), móvil vía SecureStore.
- No afirmar E2E sin backend + PostgreSQL activos.
- Lógica compartida vive en `packages/*`; la web la consume vía barriles `@/shared/*`.
- Límite de 300 líneas por archivo aplicado por `source-check` (motivo documentado en memoria de proyecto: obligó a partir un panel de admin en tres componentes).
- Dirección visual ya declarada **no negociable** en el propio `CLAUDE.md` del repo: "Apple-like, ultralimpia y premium", con mapa de skills obligatorias por tarea y regla de cierre (`web-design-guidelines` + `prefers-reduced-motion`).

## Hallazgo que condiciona todo lo que sigue: trabajo en curso sin commitear

El checkout (`rama dev`) tiene cambios **sin commit** que no pertenecen a este encargo de
UX/UI: son la Fase F1/F4 de `docs/plan/PLAN-ADMIN-PORTAL-V2.md` (auditoría, moderación,
consola `/sistema`, permisos), dada por "implementada y verificada" en sesiones previas pero
nunca commiteada. Afectan justo a los archivos que una reorganización de IA/navegación tocaría
primero:

- `apps/web/src/shared/components/layout/nav-config.ts` (fuente única del grid de `/admin` — modificado)
- `apps/web/src/shared/components/layout/portal-shell.tsx` (shell de navegación — modificado)
- `apps/web/src/features/admin/components/{admin-overview,permissions-panel,users-panel}.tsx` (modificados)
- `apps/web/src/features/admin/services/insights-service.ts` (modificado)
- `apps/web/src/shared/server/session.ts` (modificado)
- `packages/domain/src/permissions.ts`, `packages/types/src/enums.ts` (modificados)
- Nuevo sin trackear: `admin/auditoria/`, `admin/moderacion/`, `sistema/`, `features/moderation/`, `admin/audit-panel.tsx`, `admin/audit-service.ts`

**Implicación para el plan situado:** no se puede tocar navegación, shell del portal ni los
componentes de `admin/*` como si el árbol estuviera limpio. Ver PLAN_SITUADO.md → decisión
pendiente antes de Fase 01.

## Relación con decisiones de diseño ya existentes (no partimos de cero)

El repo ya tiene tres ADR relevantes al alcance de este kit:

- **ADR-0001** — sesión BFF con cookie HttpOnly (fuera del alcance visual, pero fija cómo se
  resuelven los estados de "sesión vencida").
- **ADR-0002** — sistema de tokens dual-theme (dark/light) vía custom properties CSS,
  `data-theme` en `<html>`, cookie `gymsheet-theme`, sin FOUC. Ya cubre buena parte de lo que
  fases/03 (Dirección visual y tokens) pediría desde cero.
- **ADR-0003** — dirección "Apple premium, ultralimpio": regla del acento `--volt` (solo acción
  primaria + un dato por pantalla, nunca superficie/borde/glow/sombra), `hover-lift` como único
  realce de tarjeta, motion tokenizado (`--dur-1..6`, `--ease-*`). Según memoria de proyecto:
  fases 0-5 hechas y verificadas (tokens, tipografía, primitivas UI, motion base, nav del portal
  shell), fase 6 (barrido del resto de pantallas) **parcial**. View Transitions API aplazada.
  QA visual en navegador pendiente.

Este kit (`docs/refactor-profesional/`) es más amplio que ADR-0003: además de dirección visual
y tokens, pide reorganización de IA por tareas, arquitectura por contratos (atomic + SOLID),
catálogo de estados completo por control, medición de rendimiento/accesibilidad con
presupuesto, y gobierno de entrega — no solo un barrido visual. **Trata ADR-0002/ADR-0003 como
baseline aceptado de las fases 03/05, no como algo que reiniciar.**

## Comandos reales disponibles

| Comando | Alcance | Requiere DB/backend |
|---|---|---|
| `yarn turbo run source-check type-check lint test --filter=!@gymsheet/mobile` | Núcleo declarado "verificado" en `CLAUDE.md` | No para type-check/lint/source-check; `test` corre Vitest (unit, sin DB) |
| `yarn workspace @gymsheet/web build` | Build de producción de Next | No |
| `yarn workspace @gymsheet/web test:e2e` | Playwright | Sí — backend + Postgres reales |
| `yarn workspace @gymsheet/mobile type-check` | Tipos de Expo/RN | No |

Ver BASELINE.md para qué de esto se ejecutó realmente en esta pasada y con qué resultado.
