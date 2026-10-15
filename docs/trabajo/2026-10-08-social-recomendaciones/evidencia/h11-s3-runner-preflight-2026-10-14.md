# H11.S3 — registro del runner y preflight PAIR (2026-10-14)

Se registraron H11.S3.M1–M4 en `scripts/qa/run-social-pair.py`, con roles Android/iOS/Web, afirmaciones de evidencia obligatorias y selección por `--phase H11`. El caso M2/M3 incluye C_WEB para observar que la pausa/reanudación conserva la conexión y cambia elegibilidad de descubrimiento; M4 incluye observación del chat en ambos clientes de B.

## Verificaciones

- `python3 -m unittest scripts/qa/test_run_social_pair.py`: PASS 58/58.
- `python3 scripts/qa/run-social-pair.py --phase H11 --output scripts/qa/evidence/runs/h11-pair-preflight-2026-10-14/manifest.json`: BLOCKED, cuatro casos reportados y sin secretos.

El manifiesto requiere quince drivers de rol aún ausentes. Android no está conectado, iOS no está booted y `/api/v1` no está listo en el puerto 3011; tampoco se dispone de servicios QA ni credenciales en este entorno. No se ejecutó una interacción ni se marcó H11.S3.M1–M4 como HECHO. La evidencia de los drivers deberá generarse contra un entorno y cuentas de QA desechables.

Manifiesto: [`h11-pair-preflight-2026-10-14`](../../../scripts/qa/evidence/runs/h11-pair-preflight-2026-10-14/manifest.json).
