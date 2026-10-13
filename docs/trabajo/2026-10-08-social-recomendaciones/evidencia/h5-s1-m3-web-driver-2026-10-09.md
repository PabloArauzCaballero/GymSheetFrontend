# H5.S1.M3 — driver web PAIR

El driver A_WEB autentica al actor A por `/auth/me`, presenta una tarjeta sintética
con UUID aleatorio, intercepta su único `POST /me/discovery/swipes` y devuelve un
409 controlado. La siguiente lectura controlada del deck devuelve vacío para verificar que
la interfaz abandona la decisión optimista y muestra el estado actualizado. El
driver consulta el snapshot completo de `/me/connections` antes y después, solo
con `GET`; no envía ningún swipe ni crea o cambia conexiones.

## Verificaciones

- `node --test scripts/qa/h5_s1_m3_web.test.mjs`: 5/5 PASS.
- Drivers web M1–M3: 12/12 pruebas PASS.
- `python3 -m unittest scripts.qa.test_run_social_pair`: 40/40 PASS.
- Node syntax check, Python compile y `git diff --check`: PASS.
- Runner PAIR `--case H5.S1.M3`: BLOCKED por `API /health/ready unavailable`.
  [Manifiesto](../../../../scripts/qa/evidence/runs/h5-s1-m3-2026-10-09/manifest.json)
  registra `secretsIncluded: false`.

El conflicto y la siguiente baraja están simulados en el navegador; el API real no recibe la mutación. El driver espera que la UI inicie su GET de reconciliación después de observar el 409 y comprueba que el harness no cambió el snapshot de conexiones del actor, pero no reemplaza una prueba concurrente 409 contra el backend.
H5.S1.M3 permanece EN CURSO hasta ejecutar aceptación en infraestructura y cubrir
la carrera persistida del servidor.
