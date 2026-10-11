#!/bin/zsh
# RF-15 p04/p05. Uso: SIM=<udid> ./run-18b.sh. SQL solo sobre la base local `gym_sheet` (socket /tmp/pgs, :5433).
set -e
D="$(cd "$(dirname "$0")" && pwd)"
SIM=${SIM:?define SIM=<udid>}
PSQL=(psql -h /tmp/pgs -p 5433 -U postgres -d gym_sheet -Atq)
EMAIL_SQL="(select id from usuarios where email='athlete.mock@gymsheet.local')"
sid() { $PSQL -c "select id from sesiones_entrenamiento where estado='EN_PROGRESO' and usuario_id=$EMAIL_SQL" | head -1; }
prep() { # $1 = FALLOS_PREVIOS
  cat > /tmp/gs-18b-prep.yaml <<Y
appId: app.gymsheet.mobile
env:
  EMAIL: athlete.mock@gymsheet.local
  FIRST: Athlete
---
- runFlow: $D/login-as.subflow.yaml
- runScript:
    file: $D/scripts-cancel-open-session.js
    env: { EMAIL: 'athlete.mock@gymsheet.local' }
- runScript:
    file: $D/scripts-reset-programs.js
    env: { EMAIL: 'athlete.mock@gymsheet.local' }
- runScript:
    file: $D/scripts-progresion-prep.js
    env: { EMAIL: 'athlete.mock@gymsheet.local', REPS: '5', FALLOS_PREVIOS: '$1' }
Y
  maestro --device "$SIM" test /tmp/gs-18b-prep.yaml
}
# p04: fallo 1 por API + sesión 2 fallida terminada en la app.
prep 1
maestro --device "$SIM" test -e SCENARIO=fallos -e SESSION="$(sid)" "$D/18b-progresion-fallos-y-descarga.yaml"
# p05: hoy cae en una semana de descarga (SIMULACIÓN: fechas del programa -21 días).
prep 0
$PSQL <<SQL
with p as (select id from training.training_programs where estado='ACTIVE' and carril='STRENGTH' and usuario_id=$EMAIL_SQL)
update training.program_weeks w set semana_inicio = semana_inicio - 21 from p where w.program_id = p.id;
update training.training_programs set fecha_inicio = fecha_inicio - 21, fecha_fin_prevista = fecha_fin_prevista - 21
 where estado='ACTIVE' and carril='STRENGTH' and usuario_id=$EMAIL_SQL;
SQL
maestro --device "$SIM" test -e SCENARIO=descarga -e SESSION="$(sid)" "$D/18b-progresion-fallos-y-descarga.yaml"
