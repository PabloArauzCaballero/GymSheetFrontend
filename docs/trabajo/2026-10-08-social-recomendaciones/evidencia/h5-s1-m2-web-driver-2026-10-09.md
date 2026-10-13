# H5.S1.M2 — driver A_WEB

Se añadió `H5.S1.M2-A_WEB.py` y el driver Playwright correspondiente. Usa el token A solo para `/auth/me` y como cookie HTTP-only del origen web. Intercepta exclusivamente el GET `/api/backend/me/discovery/deck` y devuelve `{ ok: true, data: [] }`. Comprueba que Descubrir muestra “No quedan cartas”, explica que no hay personas para esos filtros, ofrece el enlace a Comunidad y no muestra botones de swipe. Cuando el entorno está disponible guarda una captura con nombre único, modo `0600` y SHA-256.

La baraja vacía es una respuesta controlada en el navegador para verificar el estado de UI; el driver no altera preferencias, conexiones ni otros datos persistentes y no afirma que la API real devuelva cero candidatos. Comprueba que el enlace a Comunidad apunta a `/comunidad`; no abre esa pantalla ni cambia preferencias.

```text
Node 22: `node --test scripts/qa/h5_s1_m2_web.test.mjs` → 2/2 PASS
`node --check scripts/qa/h5_s1_m2_web.mjs` → PASS
`python3 -m py_compile scripts/qa/drivers/H5.S1.M2-A_WEB.py` → PASS
Sin token/bases QA: el wrapper devuelve BLOCKED (exit 2) antes de lanzar Chromium o crear archivos.
Aunque el manifiesto registra el `node` general del proceso como v24.19.0, ambos wrappers seleccionan el fallback compatible `/opt/homebrew/opt/node@22/bin/node` v22.23.3.
Runner: `python3 -m unittest scripts/qa/test_run_social_pair.py` → 40/40 PASS
```

El manifest de H5 enumera los ocho casos: M1/M2 quedan `BLOCKED` por API `/health/ready` no disponible, y los otros seis por drivers de rol faltantes. No incluye secretos: [manifiesto](../../../../scripts/qa/evidence/runs/h5-web-m1-m2-2026-10-09/manifest.json). No hubo navegación real contra QA ni capturas de aceptación.
