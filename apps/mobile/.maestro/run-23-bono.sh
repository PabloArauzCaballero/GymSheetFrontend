#!/bin/zsh
# Bono del modo en el resumen (RF-18 p01 y p04). Uso: SIM=<udid> ./run-23-bono.sh
# SIMULACIÓN por SQL en la base local `gym_sheet` (socket /tmp/pgs, :5433): retrocede 15 min el inicio de la
# sesión en curso (el bono solo se muestra si la sesión cuenta, y cuenta desde los 10 minutos).
set -e
D="$(cd "$(dirname "$0")" && pwd)"
SIM=${SIM:?define SIM=<udid del simulador>}
backdate() {
  psql -h /tmp/pgs -p 5433 -U postgres -d gym_sheet -Atq -c "update sesiones_entrenamiento set fecha_inicio = now() - interval '15 minutes' where estado='EN_PROGRESO' and usuario_id=(select id from usuarios where email='athlete.mock@gymsheet.local') returning id" | head -1
}
maestro --device "$SIM" test "$D/23d-a-bono-preparar.yaml"
SID=$(backdate); echo "sesión 1: $SID"
maestro --device "$SIM" test -e SESSION="$SID" "$D/23d-b-bono-resumen-y-sin-modo.yaml"
SID=$(backdate); echo "sesión 2: $SID"
maestro --device "$SIM" test -e SESSION="$SID" "$D/23d-c-bono-sin-modo.yaml"
