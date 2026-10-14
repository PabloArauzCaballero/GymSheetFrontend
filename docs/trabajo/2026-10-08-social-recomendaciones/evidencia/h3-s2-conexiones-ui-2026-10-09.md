# H3.S2 — estado de conexiones entre superficies

## Cambios aplicados

- Web refresca solicitudes y directorio al aceptar/rechazar/retirar; aceptar también invalida la lista de conversaciones. Se agregaron pruebas de aceptar y retirar.
- En web, devolver un descarte ahora invalida el prefijo real de la baraja (`gym-directory/deck`). Antes se invalidaba `discovery/deck`, una clave que la baraja no usa.
- Descubrir conserva el historial local y evita refetchear la baraja activa después de PASS; la respuesta 409 sí vuelve a pedir la baraja explícitamente para reconciliar el estado autoritativo. Esto evita que “Deshacer” desaparezca tras vaciar la baraja.
- Móvil centraliza la invalidación de directorio, conexiones, perfiles en caché y personas/áreas del mapa. La usa la bandeja de solicitudes, el mapa, perfil, Comunidad, Descubrir, Interacciones y Personas bloqueadas. Aceptar desde solicitudes/Likes también invalida conversaciones; deshacer un match invalida chats. El mapa ofrece Mensaje cuando ya están conectados y cancelar cuando la solicitud salió de A. Bloquear refresca la lista de bloqueados.
- El helper de caché tiene comando propio `yarn workspace @gymsheet/mobile test:social-cache`.
- El runner PAIR ya registra `H3.S2.M1–M4` y explica cada rol/afirmación. Si falta un driver, la corrida devuelve `BLOCKED` en vez de fingir aceptación.

## Verificación local

- Web: type-check PASS; ESLint dirigido PASS; `requests-tab.test.tsx` y `passes-panel.test.tsx` → 3/3 PASS.
- Móvil: type-check PASS; ESLint dirigido PASS; `yarn workspace @gymsheet/mobile test:social-cache` → 3/3 PASS.
- Runner: `python3 -m unittest -v test_run_social_pair.py` desde `scripts/qa` → 43/43 PASS; `git diff --check` PASS.
- Web: `descubrir-client.test.tsx`, `requests-tab.test.tsx` y `passes-panel.test.tsx` → 8/8 PASS; ESLint dirigido y type-check PASS.
- Navegador Chromium: H3.S2.M1, M2 y M4 → 3/3 PASS en una corrida; M3 → 1/1 PASS aislado. M3 confirma restauración de carta y que no se elimina ningún bloqueo.
- Los siete drivers PAIR web de H3.S2 están implementados. Contratos de drivers 6/6, suite del runner 43/43, `py_compile` y `node --check` PASS. Cada driver exige IDs exactos y ACK del fixture antes de modificar datos.
- Maestro: el YAML de M1–M3 parsea correctamente; el CLI no está instalado, así que no se pudo validar ni ejecutar el flujo nativo.
- Prueba RED→GREEN de `PassesPanel`: RED mostró que solo se invalidaban `interactions/passes/sent`, `interactions/counts` y la clave errónea `discovery/deck`; GREEN confirmó invalidación de `directoryKeys.all`.
- El lint completo de móvil sigue fallando en archivos ajenos a este cambio: `h5-s2-m1-fixture.test.mjs` (globals `Response`/`setImmediate`) y `button-accessibility.test.mjs` (`URL`); los archivos modificados de H3 pasan ESLint dirigido.
- Se atendieron los hallazgos de revisión web/móvil: se corrigieron los caminos restantes de invalidación, el refresco de mapa se limitó a personas/áreas y el test móvil quedó invocable con su script.

## Aceptación pendiente

La aceptación PAIR entre dos sesiones sigue pendiente: no se corrió el runner con IDs reservados y ACK de fixture para cada caso. Los drivers bloquean antes de escribir si no reciben esos valores. Tampoco se pudo ejecutar la aceptación nativa porque falta Maestro CLI. Las pruebas Chromium y de componentes sí pasan, pero no sustituyen la evidencia PAIR ni Android/iOS; las filas H3.S2 siguen pendientes de esas dos corridas.
