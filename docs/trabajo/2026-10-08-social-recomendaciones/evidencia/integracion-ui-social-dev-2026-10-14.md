# Integración de UI social en `dev` — 2026-10-14

Se integró `feat/social-tinder-instagram` sobre el `dev` actualizado del frontend y se publicó el merge commit `dbd2453` en `GymSheetFrontend/dev`.

## Reconciliación aplicada

- Se mantuvieron los cambios más recientes de `dev` en entrenamientos, ejercicios, rutinas, programas, comunidad y navegación; se integraron los flujos sociales de descubrimiento, conexiones, bloqueos, mapa, reels, historias, moderación y chat.
- Se combinaron los servicios API sin reemplazar las APIs nuevas de `dev`. La pantalla de stories conserva selección de audiencia, chat conserva audio/edición/recibos, y los swipes transmiten el identificador de impresión.
- Se incorporó el contrato web para denunciar rutinas, ejercicios y comentarios. La implementación backend correspondiente se publicó en `GymSheetBackend/dev` como `2ea5cb7`, usando la migración de moderación ya registrada.
- Se corrigió el evento de entrenamiento aceptado para distinguir las invitaciones canceladas, y el contrato de cola de moderación normaliza `content_hidden: null` a `false`.
- Se retiraron del índice los `__pycache__` generados durante validación; no quedan marcadores de conflicto.

## Verificación ejecutada

- Mobile y Web: `tsc --noEmit` PASS.
- Web: ESLint dirigido PASS; suites de moderación, evento de sistema y edición de chat: 20/20 PASS.
- Backend: type-check PASS; ESLint dirigido PASS; suites de política y servicio de moderación: 30/30 PASS.
- QA documental: runner 58/58 PASS; validador 197 microtareas, 37/37 requisitos trazados y 0 enlaces rotos.
- `git diff --cached --check` PASS antes de publicar el merge.

## Pendiente del plan

No se ejecutó PAIR ni E2E PostgreSQL contra un entorno QA real: en esta sesión no estaban disponibles API/BD QA, cuentas de dos participantes y drivers/dispositivos para Android+iOS. Por eso los hitos H1–H12 que requieren aceptación runtime siguen abiertos; este merge entrega el código y sus contratos, no la aceptación final del plan.
