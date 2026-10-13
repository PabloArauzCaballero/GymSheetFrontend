# H5.S1.M4 — verificación parcial del regreso a Conocer

Fecha: 2026-10-09 (America/La_Paz)  
Checkout: `GymSheetFrontend`, rama `dev`.

## Implementado

`apps/web/e2e/social/conocer.spec.ts` incluye un recorrido que recibe una carta válida, envía un swipe aceptado, espera la respuesta vacía interceptada, sale de Conocer y vuelve. Toma el contador después de ese refetch y comprueba que al regresar se hace otra petición cuya URL no lleva `cursor`.

## Verificaciones ejecutadas

- `PATH=/Users/josejeremias/.npm/_npx/52027bd8fc0022aa/node_modules/node/bin:$PATH yarn workspace @gymsheet/web playwright test e2e/social/conocer.spec.ts` — PASS, matriz combinada 8/8; M4 pasa en Chromium y viewport Playwright móvil.
- `PATH=/Users/josejeremias/.npm/_npx/52027bd8fc0022aa/node_modules/node/bin:$PATH yarn workspace @gymsheet/web type-check` — PASS.
- `git diff --check` — PASS.

## Aún pendiente

La API se levantó temporalmente en `3011` contra `gymsheet_social_qa` (`127.0.0.1:55432`), con claves JWT sintéticas, correo en modo log, push y recomendaciones externos desactivados. Readiness indicó DB lista y migraciones al día. El bootstrap no insertó filas de catálogo; actualizó 24 niveles y 28 insignias existentes. El swipe y la baraja de este escenario están interceptados; la respuesta vacía se entrega desde la segunda petición, incluida la que sigue al swipe. No demuestra persistencia del swipe en PostgreSQL, no simula un cursor vencido y no acredita aceptación PAIR, Android o iOS. API y Next se apagaron al terminar. H5.S1.M4 permanece EN CURSO.
