# H8 PAIR — preflight local (2026-10-10)

Auditoría de solo lectura para saber si se puede ejecutar la aceptación H8 en dos actores.

## Resultado

- API `127.0.0.1:3011`: no hay listener; `/health/ready` rechaza la conexión.
- Android: `emulator -list-avds` vacío. `adb devices -l` no pudo iniciar el daemon por error al crear el socket (`Operation not permitted`); no se intentó repetirlo.
- iOS: CoreSimulator devolvió conexión inválida/rechazada; no hay simulador booted disponible.
- Maestro no está en PATH.
- No se encontraron nombres de variables QA para URL, serial/UDID, tokens A/B/C o run ID.
- Espacio libre temporal: 2.9 GiB; la evidencia del intento AVD del 2026-10-10 requería 7.37 GiB.
- Al momento de la auditoría el runner no aceptaba H8. Después se añadió el registro y se ejecutó `python3 scripts/qa/run-social-pair.py --phase H8 --output /private/tmp/gymsheet-h8-pair-check.json`: emitió 14/14 IDs H8 con `requiredRoles`, `secretsIncluded=false` y veredicto agregado `BLOCKED` (exit 2). Los 14 siguen bloqueados porque faltan drivers y precondiciones físicas; el archivo temporal se eliminó tras verificarlo.

## Consecuencia

PAIR no se puede ejecutar en este entorno. El runner ya puede generar el manifiesto, pero aún no tiene drivers H8. Para H8.S3.M1 faltan las capturas/logs de A publicando con B seleccionado, B viendo la story tras recargar y C quedando excluido. Para H8.S3.M2–M4 falta la evidencia física de lifecycle, corte de red/reintento y eliminación mientras B mira. También faltan los recorridos PAIR de reacción, respuesta y referencia/rechazo tras desconexión de H8.S2.

No se arrancaron servicios ni se modificaron dispositivos, cuentas o datos. La consulta `adb devices` hizo un intento automático de iniciar el daemon, que falló antes de conectarse a un dispositivo. Este diagnóstico no cambia el estado de implementación local ni cuenta como PASS de aceptación.
