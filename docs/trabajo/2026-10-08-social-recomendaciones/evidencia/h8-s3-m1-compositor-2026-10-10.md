# H8.S3.M1 — Compositor de audiencia (2026-10-10)

Web y móvil ahora ofrecen dos opciones en el compositor de una story: todas las conexiones aceptadas (predeterminado en cada apertura) o personas elegidas. La lista viene de conexiones vigentes aceptadas. En modo selectivo, ambas interfaces exigen al menos una persona y envían `audienceMode=SELECTED_CONNECTIONS` junto con `recipientIds` JSON en multipart. El backend vuelve a validar las conexiones al recibir la carga y revalida cada lectura posterior.

## Verificación ejecutada

- `yarn workspace @gymsheet/web test --run src/features/stories/services/stories-service.test.ts` — PASS, 2/2: multipart seleccionado y default legacy sin opciones explícitas.
- `yarn workspace @gymsheet/mobile type-check` — PASS.
- `yarn workspace @gymsheet/web type-check` — PASS.
- E2E backend H8.S1.M2 — PASS, 1/1 en base PostgreSQL temporal aislada; persiste la audiencia y B/C reciben permisos distintos.

## Pendiente

No se ejecutó H8.S3.M1 con PAIR. Falta probar visualmente en móvil el flujo de selección, publicar con A, refrescar el feed de B y confirmar la ausencia para C; tampoco hubo una sesión web real. El caso permanece EN CURSO.

## Recuperación del selector móvil

Si falla la carga de conexiones aceptadas, el sheet ofrece `Reintentar`. En modo `SELECTED_CONNECTIONS`, las acciones de publicar quedan deshabilitadas hasta que la consulta termine correctamente y haya al menos un destinatario; el helper evita IDs duplicados.

- `apps/mobile/src/lib/story-audience-selection.test.ts` — PASS, 3/3.
- Type-check móvil — PASS.
- ESLint focal y `git diff --check` — PASS.

Esto cubre recuperación y habilitación local del selector; no reemplaza la aceptación PAIR pendiente.

En web, `submitUpload` aplica el mismo guard y el estado de revalidación se anuncia mientras se recargan conexiones. La prueba focal `src/features/stories/lib/story-audience-selection.test.ts` pasó 2/2; type-check, ESLint dirigido y diff-check PASS. El botón existente de reintento vuelve a consultar conexiones.
- Regresión móvil del visor de stories: `yarn workspace @gymsheet/mobile test:stories` — 4/4 PASS; cubre presentación de viewers, no la selección de audiencia.
- ESLint dirigido a los archivos de stories/media modificados en web y móvil — PASS.
- El resolver móvil de media valida el origen antes de adjuntar bearer; su prueba específica — 3/3 PASS. Esto evita enviar el token a un host externo si el DTO contiene una URL inesperada.
- ESLint dirigido, type-check web y móvil, prueba web del servicio (2/2), prueba móvil del visor (4/4) y `git diff --check` — PASS después de los últimos cambios de accesibilidad y estados de carga/error.
