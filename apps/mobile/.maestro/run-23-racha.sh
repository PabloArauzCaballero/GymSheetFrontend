#!/bin/zsh
# Racha de cuatro semanas + fin de programa (RF-18 p03, RF-19 p01). Uso: SIM=<udid> ./run-23-racha.sh
# SIMULACIÓN por SQL en la base local `gym_sheet` (socket /tmp/pgs, :5433), nada más:
#  - retrocede 15 min el inicio de la sesión de hoy (una sesión cuenta desde los 10 minutos);
#  - retrocede 21 días las fechas del programa de fuerza activo y marca sus semanas 1–3 como cumplidas
#    (x1,2 · x1,4 · x1,6), para que hoy caiga en la semana 4;
#  - borra la insignia MODO_SOBRECARGA_4 de la cuenta si ya la tenía de una pasada anterior, para que se vuelva a ganar en esta.
set -e
D="$(cd "$(dirname "$0")" && pwd)"
SIM=${SIM:?define SIM=<udid del simulador>}
PSQL=(psql -h /tmp/pgs -p 5433 -U postgres -d gym_sheet -Atq)
maestro --device "$SIM" test "$D/23a-cierre-preparar.yaml"
SID=$($PSQL -c "update sesiones_entrenamiento set fecha_inicio = now() - interval '15 minutes' where estado='EN_PROGRESO' and usuario_id=(select id from usuarios where email='athlete.mock@gymsheet.local') returning id" | head -1)
$PSQL <<SQL
with p as (select id from training.training_programs where estado='ACTIVE' and carril='STRENGTH' and usuario_id=(select id from usuarios where email='athlete.mock@gymsheet.local'))
update training.program_weeks w set semana_inicio = semana_inicio - 21 from p where w.program_id = p.id;
update training.training_programs set fecha_inicio = fecha_inicio - 21, fecha_fin_prevista = fecha_fin_prevista - 21, multiplicador_actual = 1.60
 where estado='ACTIVE' and carril='STRENGTH' and usuario_id=(select id from usuarios where email='athlete.mock@gymsheet.local');
update training.program_weeks w set cumplida = true, sesiones_hechas = sesiones_plan, multiplicador = 1.0 + 0.2 * semana_numero, cerrada_en = now()
 from training.training_programs p where p.id = w.program_id and p.estado='ACTIVE' and p.carril='STRENGTH' and w.semana_numero <= 3
 and p.usuario_id=(select id from usuarios where email='athlete.mock@gymsheet.local');
delete from progression.user_badges where usuario_id=(select id from usuarios where email='athlete.mock@gymsheet.local') and badge_id=(select id from progression.badges where code='MODO_SOBRECARGA_4');
SQL
echo "sesión $SID; semanas 1-3 simuladas"
maestro --device "$SIM" test -e SESSION="$SID" "$D/23c-racha-cuatro-semanas.yaml"
psql -h /tmp/pgs -p 5433 -U postgres -d gym_sheet -c "select subject, body, channel, status, metadata->>'type' as tipo from notifications.messages where recipient_user_id=(select id from usuarios where email='athlete.mock@gymsheet.local') order by created_at desc limit 2"
