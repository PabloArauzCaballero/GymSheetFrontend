# Preflight social — sondeo de esta continuación

Fecha: 2026-10-09, America/La_Paz. Solo consultas de estado; no se iniciaron ni modificaron servicios/dispositivos.

- `curl -sS -m 2 http://127.0.0.1:3011/health/ready` — conexión rechazada (`HTTP 000`).
- `xcrun simctl list devices booted` — lista vacía bajo iOS 26.5.
- `command -v adb` — sin salida; ADB no está instalado o no está en `PATH`.

La evidencia anterior de PostgreSQL/API temporales y iPhone booted corresponde a una corrida previa; no describe el estado actual. No se ejecutó PAIR.
