# H5.S2.M1 — driver PAIR A_WEB

## Recorrido

El driver autentica al actor A mediante `/auth/me` y abre `Descubrir`. Intercepta la baraja con una candidata sintética. Tab llega al botón «Me interesa» con foco visible; Space envía el primer `LIKE`. El driver retiene la respuesta 503 hasta observar que la tarjeta desapareció de forma optimista, captura ese estado y luego comprueba que la misma tarjeta reaparece tras el error. Después arrastra esa tarjeta y comprueba que el segundo POST devuelve 200 y que aparece el estado vacío.

Las dos solicitudes se interceptan en el navegador. El driver exige exactamente dos POST a `/me/discovery/swipes`, con payloads idénticos y el mismo ID sintético, y guarda capturas del foco, la retirada optimista y el resultado del gesto. No escribe una decisión ni una conexión en el backend.

## Validación

- `node --test scripts/qa/h5_s2_m1_web.test.mjs`: 3/3 PASS. Las pruebas negativas detectan payloads distintos y una retirada optimista no observada.
- `python3 -m unittest scripts.qa.test_run_social_pair`: 40/40 PASS. El contrato confirma que el runner encuentra `A_WEB` y deja como faltantes solo `A_ANDROID` y `A_IOS` para este caso.
- `node --check scripts/qa/h5_s2_m1_web.mjs` y `python3 -m py_compile` del driver y del test del runner: PASS.
- `yarn workspace @gymsheet/web test:e2e e2e/social/conocer.spec.ts --grep 'H5.S2.M1'`: no llegó a ejecutar Playwright. Node 24 fue rechazado por el workspace; al repetir con Node 22, `webServer` agotó 60 s esperando `http://localhost:3002`. Durante el arranque, la landing falló al cargar el directorio público de gimnasios porque el backend no respondió.
- `python3 scripts/qa/run-social-pair.py --case H5.S2.M1`: `BLOCKED`, run `e67dc7ec-51e9-4f5d-89ce-44d579e26498`. El manifiesto muestra `/health/ready` no listo y faltan los drivers nativos `A_ANDROID` y `A_IOS`; `secretsIncluded` es `false`.
- Consulta directa de solo lectura al readiness configurado del runner (`http://127.0.0.1:3011/api/v1/health/ready`): `API /health/ready unavailable`.

La prueba anterior H5.S2.M1 de la matriz Playwright local sigue siendo evidencia del comportamiento web con solicitudes interceptadas; esta nueva ejecución no la reemplaza ni prueba persistencia. El hito permanece **EN CURSO** hasta tener PAIR web ejecutable, roles Android/iOS y aceptación de accesibilidad nativa.

Manifiesto: [corrida PAIR H5.S2.M1](../../../../scripts/qa/evidence/runs/h5-s2-m1-2026-10-09/manifest.json).

Actualización posterior: se implementaron los roles A_ANDROID/A_IOS y la fixture aislada; consultar [evidencia nativa](h5-s2-m1-native-fixture-2026-10-09.md) y el [preflight más reciente](../../../../scripts/qa/evidence/runs/ed669d6c-a5b0-4b28-9388-dfa0fcdb117d/manifest.json). La corrida anterior conserva el estado histórico de cuando los roles faltaban.
