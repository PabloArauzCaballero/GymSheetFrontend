#!/usr/bin/env bash
# Corre los flujos de Maestro del asistente de rutinas (08, 09 y 10) contra el
# simulador de iOS arrancado y coloca las capturas en
#   docs/evidencias/rutinas/RF-XX/movil/RF-XX_pNN_<paso>_ios_oscuro.png
#
# Maestro no escribe `takeScreenshot` donde se invoca: cada corrida deja las
# imágenes en <debug-output>/<flujo>/takeScreenshot/, de donde se sacan aquí. El
# nombre de cada captura ya lleva el requisito (RF-XX), así que el destino sale
# del propio nombre.
#
# Requisitos (ver docs/mobile/ios-paridad.md): simulador arrancado con la app de
# desarrollo instalada, Metro en marcha y el backend en EXPO_PUBLIC_API_URL.
set -euo pipefail
cd "$(dirname "$0")/.."

export PATH="$HOME/.maestro/bin:$PATH"
export MAESTRO_CLI_NO_ANALYTICS=1

repo_root="$(cd ../.. && pwd)"
evidence_root="$repo_root/docs/evidencias/rutinas"
runs_dir="$(mktemp -d)"
echo "Registros de Maestro en $runs_dir"

failed=()
# Sin argumentos corre los tres; con argumentos, sólo esos flujos (por ejemplo `08 09`).
flows=(.maestro/08-crear-rutina.yaml .maestro/09-seleccion-multiple.yaml .maestro/10-ficha-favorito-like.yaml)
if [ "$#" -gt 0 ]; then
  flows=()
  for number in "$@"; do flows+=(.maestro/"$number"-*.yaml); done
fi

for flow in "${flows[@]}"; do
  name="$(basename "$flow" .yaml)"
  echo "── $flow"
  if maestro test --debug-output "$runs_dir/$name" "$flow" > "$runs_dir/$name.log" 2>&1; then
    echo "   PASS"
  else
    echo "   FAIL (ver $runs_dir/$name.log)"
    failed+=("$name")
  fi
  # Las capturas se recogen aunque el flujo falle: las que llegó a tomar son
  # evidencia de hasta dónde funcionó.
  while IFS= read -r -d '' png; do
    file="$(basename "$png")"
    rf="${file%%_*}"
    mkdir -p "$evidence_root/$rf/movil"
    cp "$png" "$evidence_root/$rf/movil/$file"
  done < <(find "$runs_dir/$name" -path '*takeScreenshot*' -name 'RF-*.png' -print0)
done

if [ "${#failed[@]}" -gt 0 ]; then
  echo "Fallaron: ${failed[*]}" >&2
  exit 1
fi
echo "Capturas en $evidence_root"
