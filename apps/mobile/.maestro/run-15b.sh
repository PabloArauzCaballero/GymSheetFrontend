#!/bin/zsh
# Uso: SIM=<udid> ./run-15b.sh. SQL de estado limpio solo sobre la base local `gym_sheet` (socket /tmp/pgs, :5433).
set -e
D="$(cd "$(dirname "$0")" && pwd)"
SIM=${SIM:?define SIM=<udid>}
psql -h /tmp/pgs -p 5433 -U postgres -d gym_sheet -Atq <<SQL
delete from moderation.reports where status='PENDIENTE' and reporter_user_id=(select id from usuarios where email='expiring.mock@gymsheet.local');
delete from community.content_comments where autor_id=(select id from usuarios where email='expiring.mock@gymsheet.local') and texto like 'Gran rutina, la sigo%';
SQL
maestro --device "$SIM" test "$D/15b-comunidad-comentario-y-aviso.yaml"
# Fotogramas del aviso: bucle de capturas del simulador mientras 15c pulsa «Enviar denuncia». Los fotogramas
# quedan en $FRAMES (por defecto /tmp/gs-15b-frames); se elige a ojo el que enseña el aviso.
FRAMES=${FRAMES:-/tmp/gs-15b-frames}
rm -rf "$FRAMES"; mkdir -p "$FRAMES"
( i=0; while true; do xcrun simctl io "$SIM" screenshot --type=jpeg "$FRAMES/f$(printf %03d $i).jpg" >/dev/null 2>&1; i=$((i+1)); done ) &
LOOP=$!
maestro --device "$SIM" test "$D/15c-enviar-denuncia.yaml" || true
kill $LOOP
echo "fotogramas en $FRAMES"
