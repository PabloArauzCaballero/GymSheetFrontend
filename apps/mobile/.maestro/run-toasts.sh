#!/bin/zsh
# Uso: SIM=<udid> ./run-toasts.sh 13|14 [carpeta-de-fotogramas]
# Los avisos (toasts) duran pocos segundos y Maestro no los ve ni en el árbol de accesibilidad ni en
# `takeScreenshot` (espera a que la pantalla quede quieta). Se corre la parte A del flujo (NN-*.yaml),
# se arranca un bucle de `simctl io screenshot` y se corre la parte B (NNb-*.yaml). Se elige a ojo el
# fotograma que enseña el aviso y se copia a docs/evidencias/rutinas/RF-XX/movil/.
set -e
D="$(cd "$(dirname "$0")" && pwd)"
SIM=${SIM:?define SIM=<udid>}
N=${1:?define 13 o 14}
FRAMES=${2:-/tmp/gs-toast-frames-$N}
maestro --device "$SIM" test "$D"/$N-*.yaml
rm -rf "$FRAMES"; mkdir -p "$FRAMES"
( i=0; while true; do xcrun simctl io "$SIM" screenshot --type=png "$FRAMES/f$(printf %03d $i).png" >/dev/null 2>&1; i=$((i+1)); done ) &
LOOP=$!
maestro --device "$SIM" test "$D"/${N}b-*.yaml || true
kill $LOOP
echo "fotogramas en $FRAMES"
