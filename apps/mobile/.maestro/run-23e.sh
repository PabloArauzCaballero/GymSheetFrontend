#!/bin/zsh
# Uso: SIM=<udid> ./run-23e.sh. SQL solo en la base local: retrocede 15 min la sesión en curso (SIMULACIÓN).
set -e
D="$(cd "$(dirname "$0")" && pwd)"
SIM=${SIM:?define SIM=<udid>}
maestro --device "$SIM" test "$D/23e-sesion-sin-plan-semanal.yaml"
SID=$(psql -h /tmp/pgs -p 5433 -U postgres -d gym_sheet -Atq -c "update sesiones_entrenamiento set fecha_inicio = now() - interval '15 minutes' where estado='EN_PROGRESO' and usuario_id=(select id from usuarios where email='athlete.mock@gymsheet.local') returning id" | head -1)
maestro --device "$SIM" test -e SESSION="$SID" "$D/23e-b-terminar.yaml"
