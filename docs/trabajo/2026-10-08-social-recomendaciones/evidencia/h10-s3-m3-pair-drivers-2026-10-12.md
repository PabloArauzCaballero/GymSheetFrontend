# H10.S3.M3 — drivers PAIR de exportación ICS (2026-10-12)

Se añadieron `scripts/qa/drivers/H10.S3.M3-A_IOS.py` y `H10.S3.M3-A_WEB.py`. Ambos requieren el mismo `QA_H10_DISPOSABLE_INVITATION_ID`, comprueban que la invitación del actor A tenga una reunión materializada y publican un UID de la respuesta del backend. El driver web usa el botón de descarga dos veces y compara los ICS descargados. El driver iOS abre la pantalla de invitaciones y activa el botón de compartir; vuelve a consultar el endpoint autenticado para comprobar que el UID se conserva. El runner exige que ambas pruebas usen la misma cuenta e invitación y reporten el mismo UID. No se guardan los contenidos ICS como evidencia.

Verificación local:

| Comando                                                                                                                           | Resultado  |
| --------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `node --test scripts/qa/h10_s3_m3_web.test.mjs`                                                                                   | 3/3 PASS   |
| `python3 -m unittest scripts/qa/test_run_social_pair.py -q`                                                                       | 54/54 PASS |
| `python3 -m py_compile scripts/qa/run-social-pair.py scripts/qa/drivers/H10.S3.M3-A_IOS.py scripts/qa/drivers/H10.S3.M3-A_WEB.py` | PASS       |
| `node --check scripts/qa/h10_s3_m3_web.mjs`                                                                                       | PASS       |
| `corepack yarn workspace @gymsheet/mobile type-check`                                                                             | PASS       |
| `git diff --check`                                                                                                                | PASS       |

Se arrancó y seleccionó un iPhone 17 Pro con `QA_IOS_UDID`; el preflight `QA_IOS_UDID=D4C28B4D-3615-4E6D-9092-C180668D5EE6 python3 scripts/qa/run-social-pair.py --case H10.S3.M3 --output /tmp/gymsheet-h10-s3-m3-drivers-preflight-2026-10-12.json` terminó con exit 2 y `BLOCKED`: API `/health/ready` no disponible y falta `QA_H10_DISPOSABLE_INVITATION_ID`. El manifiesto declara roles `A_IOS` y `A_WEB`, detecta el simulador arrancado y marca `secretsIncluded=false`. No hubo ejecución de los drivers ni evidencia real de dispositivo. La importación en calendarios externos sigue sin probarse.

## Reejecución web local del 2026-10-12

Después se inició una API y PostgreSQL efímeros en localhost con dos usuarios sintéticos y una invitación desechable. El driver `H10.S3.M3-A_WEB` terminó **PASS**: la UI descargó el `.ics` dos veces y validó el mismo UID antes y después. La primera corrida mostró que la guía de bienvenida cubría los controles; el driver ahora la omite en cuentas QA nuevas. Captura: [agenda web y sesión compartida](h10-s3-m3-web-local-2026-10-12.png); resultado y límites: [cierre funcional](h10-cierre-funcional-2026-10-12.md).

## Reejecución nativa iOS del 2026-10-12

Se generó e instaló un build Release firmado localmente para el simulador iPhone 17 Pro, con la API de QA desechable. **PASS parcial:** la app abrió, aceptó el inicio de sesión de la cuenta sintética A y llegó al inicio; iOS mostró su diálogo del llavero. Esto verifica build, instalación, conectividad con la API temporal y autenticación básica, no la exportación del calendario.

Al intentar continuar Maestro dejó de conectar con el simulador. `xcrun simctl list devices booted` siguió agotando el tiempo incluso después de reiniciar los procesos `CoreSimulatorService` y `SimulatorTrampoline` y liberar los derivados de Xcode. No se pudo abrir la pantalla de invitaciones ni accionar la hoja de compartir; por eso el driver `H10.S3.M3-A_IOS` no pasó y H10.S3.M3 permanece EN CURSO. El driver Web sí pasó en el mismo entorno temporal con la misma invitación y cuenta A. No se probó importación en un calendario externo.
