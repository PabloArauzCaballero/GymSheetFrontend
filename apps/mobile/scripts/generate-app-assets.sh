#!/usr/bin/env bash
# Regenerates the launcher/splash artwork from a single vector source.
#
# The previous files were 1x1 placeholders whose IDAT chunk declared the wrong
# length, so every PNG decoder that verifies CRCs (Jimp, which is what
# `expo prebuild` uses to slice the iOS AppIcon set) refused to read them and
# the iOS prebuild aborted before it wrote a single file. Android never
# surfaced it because its adaptive icon is composited by the OS at install
# time from a foreground layer it can fail soft on.
#
# Both platforms are fed from the same source here on purpose: the icon is
# brand, not platform, and letting them drift is how an app ends up with two
# different marks on two stores.
#
# Requires: rsvg-convert (brew install librsvg)
set -euo pipefail
cd "$(dirname "$0")/.."
out=assets
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

BG='#0F172A'   # REPP navy
FG='#2E8B7B'   # REPP jade

# The official REPP R mark, copied from the supplied identity vector.
mark() {
  cat <<XML
  <path d="M25 19 H61 C82 19 94 31 88 48 C84 59 75 65 63 68 L88 101 H65 L42 70 H34 L24 101 H5 L25 19 Z M39 37 L34 54 H55 C64 54 70 50 71 43 C72 39 68 37 60 37 Z" fill="#FFFFFF"/>
  <path d="M25 61 L48 37 H62 L34 71 L14 101 H3 Z" fill="$FG"/>
XML
}

# icon.png — 1024, opaque. The App Store rejects a transparent or
# alpha-channelled icon outright, so the background is painted, not inherited.
cat > "$tmp/icon.svg" <<XML
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 120 120">
  <rect width="120" height="120" fill="$BG"/>
  $(mark)
</svg>
XML

# adaptive-icon.png — Android foreground layer, transparent, and scaled to
# ~62% so the mark survives the circular/squircle masks the launcher applies.
cat > "$tmp/adaptive-icon.svg" <<XML
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 120 120">
  <g transform="translate(22.8 22.8) scale(0.62)">
    $(mark)
  </g>
</svg>
XML

# splash.png — sits on the #000000 canvas declared in app.json with
# resizeMode "contain", so it carries the mark and no background of its own.
cat > "$tmp/splash.svg" <<XML
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 120 120">
  <g transform="translate(13.2 13.2) scale(0.78)">
    $(mark)
  </g>
</svg>
XML

cat > "$tmp/favicon.svg" <<XML
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 120 120">
  <rect width="120" height="120" fill="$BG"/>
  $(mark)
</svg>
XML

rsvg-convert -w 1024 -h 1024 "$tmp/icon.svg"          -o "$out/icon.png"
rsvg-convert -w 1024 -h 1024 "$tmp/adaptive-icon.svg" -o "$out/adaptive-icon.png"
rsvg-convert -w 2048 -h 2048 "$tmp/splash.svg"        -o "$out/splash.png"
rsvg-convert -w 48   -h 48   "$tmp/favicon.svg"       -o "$out/favicon.png"

for f in "$out"/*.png; do printf '%-28s %s\n' "$f" "$(file -b "$f")"; done
