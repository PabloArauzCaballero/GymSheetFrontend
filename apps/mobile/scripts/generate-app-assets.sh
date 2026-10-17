#!/usr/bin/env bash
# Regenera icono, icono adaptable, arranque y favicon desde el vector de la
# marca. La lógica vive en `render-brand-assets.mjs`, que comparte las
# medidas con la cortinilla animada (ver `src/components/brand/`).
#
# Requiere: rsvg-convert (brew install librsvg)
set -euo pipefail
cd "$(dirname "$0")/.."
node --import ./scripts/register-ts-extension.mjs --experimental-strip-types scripts/render-brand-assets.mjs
