#!/usr/bin/env bash
# Descarga los modelos anatómicos de Z-Anatomy (CC BY-SA 4.0) a tools/anatomy/.cache.
# Los FBX no se versionan: pesan ~80 MB y se regeneran con este script.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p .cache
BASE="https://raw.githubusercontent.com/LluisV/Z-Anatomy/PC-Version"
for f in "MuscularSystem100" "SkeletalSystem100" "Regions%20of%20human%20body100"; do
  out=".cache/$(printf '%b' "${f//%/\\x}").fbx"
  [ -s "$out" ] && { echo "ya existe: $out"; continue; }
  echo "descargando $out"
  curl -fSL --retry 3 -o "$out" "$BASE/Resources/Models/FBX/$f.fbx"
done
curl -fsSL -o .cache/LICENSE "$BASE/LICENSE" || true
ls -la .cache
