# Auditoría del sistema actual

## Arquitectura

- Frontend Next.js 16 App Router con BFF, React Query, Zod y formularios tipados.
- Backend hermano NestJS 11, Sequelize y PostgreSQL; capas controller/service/repository/mapper.
- JWT en cookie HttpOnly, allowlist de rutas BFF y autorización definitiva en backend.
- Ejercicios, multimedia, sesiones, membresías, acceso, instalaciones y notificaciones usan API real.

## Hallazgos y correcciones

- El frontend no compilaba por imports ausentes, tipos de mutación/formularios y roles: corregido.
- Vitest incluía Playwright y faltaba `@testing-library/dom`: separado y corregido.
- El temporizador actualizaba estado sincrónicamente desde un efecto: corregido.
- Backend sin seeders ejecutables: añadidos seeds base/mock idempotentes por correo.
- `WorkoutKata` no aparece en los repositorios; la fuente real es `exercises-dataset`.
- Docker Desktop no inicia; migraciones, seeds reales y E2E integrado quedan bloqueados.

## Riesgos restantes

- La licencia de Gym Visual debe aprobarse antes de importar multimedia externa.
- OpenAPI principal no cubre aún todos los controladores operativos.
- El repositorio frontend completo aparece sin seguimiento en Git; se preservó sin staging.
