# H5.S1.M4 — retorno al deck en PAIR

El driver A_WEB autentica al actor A, entrega una tarjeta sintética, intercepta
el swipe como respuesta exitosa, pulsa el enlace visible a Comunidad y verifica
su encabezado antes de volver a Descubrir. Comprueba que hubo un GET del deck
después de volver, que la URL no contiene `cursor` y que la tarjeta no reaparece.
El swipe y todos los decks de este recorrido son
controlados por el navegador; el backend no recibe la mutación.

## Verificaciones

- `node --test scripts/qa/h5_s1_m4_web.test.mjs`: 3/3 PASS.
- Runner registra el driver A_WEB y aserciones sin errores.
- `node --check`, `py_compile` y `git diff --check`: PASS.
- Runner PAIR `--case H5.S1.M4`: BLOCKED por `API /health/ready unavailable`.
  [Manifiesto](../../../../scripts/qa/evidence/runs/h5-s1-m4-2026-10-09/manifest.json)
  registra `secretsIncluded: false`.

El escenario prueba retorno a un deck nuevo y cursor libre en la solicitud; no
simula una respuesta de cursor vencido ni verifica una decisión persistida en la
API. H5.S1.M4 permanece EN CURSO hasta cubrir esas condiciones con backend real.
