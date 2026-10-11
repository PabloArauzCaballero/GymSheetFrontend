#!/bin/zsh
# Corre 23a → SQL de fecha → 23b (cierre semanal real con close-weeks). Uso: SIM=<udid> ./run-23-cierre-semanal.sh
# La SQL solo toca la base local `gym_sheet` (socket /tmp/pgs, :5433): retrocede 15 min el inicio de la sesión en curso.
set -e
D="$(cd "$(dirname "$0")" && pwd)"  # las capturas caen en el directorio desde el que se lanza
SIM=${SIM:?define SIM=<udid del simulador>}
maestro --device "$SIM" test "$D/23a-cierre-preparar.yaml"
SID=$(psql -h /tmp/pgs -p 5433 -U postgres -d gym_sheet -Atc "update sesiones_entrenamiento set fecha_inicio = now() - interval '15 minutes' where estado='EN_PROGRESO' and usuario_id=(select id from usuarios where email='athlete.mock@gymsheet.local') returning id" | head -1)
echo "sesión $SID retrocedida 15 min"
maestro --device "$SIM" test -e SESSION="$SID" "$D/23b-cierre-semanal.yaml"
