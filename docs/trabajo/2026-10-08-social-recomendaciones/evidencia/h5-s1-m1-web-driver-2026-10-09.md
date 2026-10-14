# H5.S1.M1 — driver A_WEB

Se añadió el rol `H5.S1.M1-A_WEB.py` y su implementación Playwright. El driver valida la identidad A con `/auth/me`, instala el token solo como cookie HTTP-only `gymsheet_session` del origen web y visita `/descubrir`. Intercepta únicamente el GET exacto del deck: antes de pulsar Reintentar responde con un candidato de UUID inválido; al reintentar responde con un candidato válido. Comprueba la alerta del contrato, que el candidato inválido no aparezca, que haya GET posterior y que la tarjeta válida sea visible. Guarda capturas separadas del error y la recuperación con permisos `0600` y SHA-256.

El caso no envía swipes ni modifica datos persistentes. El candidato inválido y el de recuperación son fixtures controladas en el navegador, así que esto no afirma que el backend QA emita datos corruptos.

```text
Node 22: `node --test scripts/qa/h5_s1_m1_web.test.mjs` → 5/5 PASS
`node --check scripts/qa/h5_s1_m1_web.mjs` → PASS
`python3 -m py_compile scripts/qa/drivers/H5.S1.M1-A_WEB.py` → PASS
Sin token/bases QA: el wrapper devuelve BLOCKED (exit 2) antes de lanzar Chromium o crear archivos.
El manifiesto registra el Node general como v24.19.0, mientras que el wrapper selecciona el fallback compatible `/opt/homebrew/opt/node@22/bin/node` v22.23.3.
Runner: `python3 -m unittest scripts/qa/test_run_social_pair.py` → 40/40 PASS
```

En la corrida de este informe, H5.S1.M1 estaba `BLOCKED` porque `/health/ready` no respondía; los otros siete casos estaban `BLOCKED` por sus drivers faltantes. El [manifiesto de esa corrida](../../../../scripts/qa/evidence/runs/h5-web-m1-current-2026-10-09/manifest.json) no contiene secretos. Tras agregar el driver M2, la matriz vigente está en el [manifiesto M1/M2](../../../../scripts/qa/evidence/runs/h5-web-m1-m2-2026-10-09/manifest.json): ambos casos web siguen bloqueados por API no disponible y los otros seis por drivers faltantes. Ninguna corrida ejecutó el navegador contra QA ni generó evidencia visual real.
