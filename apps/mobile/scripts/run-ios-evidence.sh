#!/usr/bin/env bash
# Runs every Maestro flow against the booted iOS Simulator and collects the
# screenshots into `ios-evidence/`.
#
# Maestro does not write `takeScreenshot` files where you invoke it: each run
# gets its own artifact directory and the images land in
#   <debug-output>/<flow name>/takeScreenshot/<name>.png
# so the images are pulled out of there afterwards. That is also why the flows
# name their screenshots with a plain `NN-slug` and no path — Maestro rejects
# any path that escapes its own output folder.
#
# Prerequisites (see docs/mobile/ios-paridad.md):
#   - a booted simulator with the app installed (`yarn workspace @gymsheet/mobile ios`)
#   - Metro running
#   - the backend reachable at EXPO_PUBLIC_API_URL
set -euo pipefail
cd "$(dirname "$0")/.."

export PATH="$HOME/.maestro/bin:$PATH"
export MAESTRO_CLI_NO_ANALYTICS=1

evidence_dir="ios-evidence"
runs_dir="$evidence_dir/.runs"
rm -rf "$runs_dir"
mkdir -p "$evidence_dir" "$runs_dir"

device=$(xcrun simctl list devices booted -j | python3 -c '
import json, sys
devices = [d for group in json.load(sys.stdin)["devices"].values() for d in group]
print(devices[0]["name"] if devices else "")
')
if [ -z "$device" ]; then
  echo "No booted simulator. Run: yarn workspace @gymsheet/mobile ios" >&2
  exit 1
fi
echo "Device: $device"
echo

# Warms the API before each flow.
#
# Not a workaround for anything in the app: the first request after a quiet
# spell pays for a fresh database connection plus the bcrypt cost, and on a
# loaded machine that alone can exceed the client's 15 s timeout, so the flow
# would be measuring the host rather than the app. A person opening the app
# would hit the same first-request cost once and then never again.
warm_api() {
  local url
  url=$(grep -E '^EXPO_PUBLIC_API_URL=' .env 2>/dev/null | cut -d= -f2-)
  [ -n "$url" ] || return 0
  curl -s -o /dev/null -m 60 -X POST "$url/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"athlete.mock@gymsheet.local","password":"MockLocal2026!"}' || true
}

failed=()
for flow in .maestro/[0-9]*.yaml; do
  name=$(basename "$flow" .yaml)
  echo "── $flow"
  warm_api

  # Dos intentos por flujo.
  #
  # El primero de una tanda falla a menudo por algo que no es la app: Maestro
  # reinstala su driver XCUITest cada vez que el simulador se ha tocado por
  # fuera (relanzar la app a mano, reinstalarla, reiniciarlo), y mientras lo
  # hace el flujo en curso se queda sin conductor. Reintentar una vez lo
  # absorbe; distinguir eso de un fallo real es imposible desde aquí, y un rojo
  # falso cuesta más que un segundo intento.
  status=FAIL
  for attempt in 1 2; do
    if maestro test --debug-output "$runs_dir/$name" "$flow" > "$runs_dir/$name.log" 2>&1; then
      status=PASS
      break
    fi
    if [ "$attempt" = 1 ]; then
      echo "   reintentando (1.er intento fallido)"
      warm_api
    fi
  done
  if [ "$status" = PASS ]; then
    echo "   PASS"
  else
    echo "   FAIL"
    failed+=("$flow")
  fi
  # Collected even on failure: the screenshots taken before the failing step are
  # the most useful thing to look at when a flow breaks.
  find "$runs_dir/$name" -path '*/takeScreenshot/*.png' -exec cp {} "$evidence_dir/" \; 2>/dev/null || true
  grep -E "COMPLETED|FAILED|WARNED" "$runs_dir/$name.log" | sed 's/^/     /' || true
  echo
done

echo "Screenshots in $evidence_dir:"
ls -1 "$evidence_dir"/*.png 2>/dev/null | sed 's/^/  /' || echo "  (none)"

if [ ${#failed[@]} -gt 0 ]; then
  echo
  echo "Failed flows:" >&2
  printf '  %s\n' "${failed[@]}" >&2
  exit 1
fi
