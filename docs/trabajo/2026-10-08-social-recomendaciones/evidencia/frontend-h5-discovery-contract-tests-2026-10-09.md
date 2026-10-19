# H5.S1.M1–M2 — pruebas locales del cliente web

Fecha: 2026-10-09 07:29 (America/La_Paz)  
Checkout: `GymSheetFrontend`, rama `dev`.  
Runtime: Node `v22.23.3` (el Node global `v24.19.0` queda fuera del rango declarado por el repo); Yarn `1.22.22`.

## Alcance comprobado

- M1: el cliente recibe mediante `fetch` simulado un envelope válido con un candidato cuyo único campo inválido es `userId`. Muestra el error de contrato, no representa ese candidato y permite reintentar.
- M2: el cliente recibe `data: []` mediante `fetch` simulado; web muestra el estado vacío, explica que no hay personas que coincidan por ahora, ofrece el enlace a Comunidad y no representa cartas. Móvil ahora usa el mismo mensaje honesto y conserva su regreso a Comunidad.

## Comandos y resultado

- TDD: al exigir el mensaje neutral primero, la prueba M2 falló porque el cliente todavía atribuía el vacío a decisiones previas (RED). Tras alinear el copy de web y móvil, la suite focal terminó en PASS.
- `yarn workspace @gymsheet/web test src/features/social/components/descubrir-client-contract.test.tsx src/features/social/components/descubrir-client.test.tsx` — PASS, 2 archivos y 6 pruebas.
- `yarn workspace @gymsheet/web type-check` — PASS.
- Desde `apps/web`: `yarn eslint src/features/social/components/descubrir-client-contract.test.tsx` — PASS, sin errores ni warnings.
- Móvil: `yarn type-check` y `yarn eslint 'app/(app)/descubrir.tsx'` — PASS.
- Backend `test/social-discovery-preferences.e2e-spec.ts`: PASS, 1 suite/1 prueba contra PostgreSQL local en `127.0.0.1:55432/gymsheet_social_qa`. La prueba configura preferencias en una cuenta sintética y comprueba que un `sucursalId` UUID válido sin candidatos produce HTTP 200 con `data: []`. El usuario y tokens del test son sintéticos; secretos JWT de ejecución generados en memoria por el shell. Backend type-check y ESLint focal PASS.
- Salida backend E2E y tally agregado posterior: [backend-h5-empty-deck-e2e-2026-10-09.txt](backend-h5-empty-deck-e2e-2026-10-09.txt).
- Playwright `e2e/social/conocer.spec.ts`: 4/4 PASS en Chromium y viewport Playwright móvil, con sesión real de cuenta sintética y solo el GET del deck interceptado. Detalle: [frontend-h5-conocer-playwright-2026-10-09.txt](frontend-h5-conocer-playwright-2026-10-09.txt).
- Consulta SQL de solo lectura posterior: 1,943 usuarios `example.test`, 10 `gymsheet.local`, 1,953 total. No hay dominios adicionales. `git diff --check` PASS en ambos checkouts.

Los comandos se ejecutaron con Node 22 anteponiendo el `bin` de `node@22` de la caché local de npm a `PATH`; no se modificó el manifiesto ni el lockfile para cambiar el runtime.

## Límite de aceptación

El caso PostgreSQL comprueba la respuesta real vacía del backend; las pruebas Playwright cubren navegador y sesión real, con el deck controlado por interceptación para fijar DTO inválido/vacío. La aceptación PAIR, y los recorridos nativos Android/iOS siguen pendientes. M1 y M2 permanecen EN CURSO.

Las pruebas web dirigidas y Playwright indicadas arriba ya pasaron. El snapshot inicial de `run-social-pair.py --phase H5` registró los ocho casos y los dejó `BLOCKED` porque entonces no había drivers. Desde ese snapshot se añadieron drivers A_WEB para S1.M1–M3; sus ejecuciones PAIR requieren que vuelva la API QA. Los otros cinco casos siguen bloqueados por falta de drivers. Esta aceptación sigue pendiente y no cambia el resultado de las pruebas web locales. Evidencia: [snapshot inicial](runner-h5-phase-2026-10-09.md), [driver M1](h5-s1-m1-web-driver-2026-10-09.md), [driver M2](h5-s1-m2-web-driver-2026-10-09.md), [driver M3](h5-s1-m3-web-driver-2026-10-09.md).
