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

BG='#000000'   # colors.background
FG='#c3f400'   # colors.volt

# The mark: a barbell, centred, drawn only with rounded rectangles so it stays
# legible when the launcher shrinks it to 40 px.
mark() { # $1 = fill
  cat <<XML
  <g fill="$1">
    <rect x="300" y="484" width="424" height="56"  rx="28"/>
    <rect x="248" y="392" width="56"  height="240" rx="20"/>
    <rect x="720" y="392" width="56"  height="240" rx="20"/>
    <rect x="176" y="432" width="56"  height="160" rx="18"/>
    <rect x="792" y="432" width="56"  height="160" rx="18"/>
    <rect x="136" y="464" width="32"  height="96"  rx="14"/>
    <rect x="856" y="464" width="32"  height="96"  rx="14"/>
  </g>
XML
}

# icon.png — 1024, opaque. The App Store rejects a transparent or
# alpha-channelled icon outright, so the background is painted, not inherited.
cat > "$tmp/icon.svg" <<XML
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="$BG"/>
  $(mark "$FG")
</svg>
XML

# adaptive-icon.png — Android foreground layer, transparent, and scaled to
# ~62% so the mark survives the circular/squircle masks the launcher applies.
cat > "$tmp/adaptive-icon.svg" <<XML
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <g transform="translate(512 512) scale(0.62) translate(-512 -512)">
    $(mark "$FG")
  </g>
</svg>
XML

# splash.png — sits on the #000000 canvas declared in app.json with
# resizeMode "contain", so it carries the mark and no background of its own.
cat > "$tmp/splash.svg" <<XML
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <g transform="translate(512 512) scale(0.78) translate(-512 -512)">
    $(mark "$FG")
  </g>
</svg>
XML

cat > "$tmp/favicon.svg" <<XML
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="$BG"/>
  $(mark "$FG")
</svg>
XML

rsvg-convert -w 1024 -h 1024 "$tmp/icon.svg"          -o "$out/icon.png"
rsvg-convert -w 1024 -h 1024 "$tmp/adaptive-icon.svg" -o "$out/adaptive-icon.png"
rsvg-convert -w 2048 -h 2048 "$tmp/splash.svg"        -o "$out/splash.png"
rsvg-convert -w 48   -h 48   "$tmp/favicon.svg"       -o "$out/favicon.png"

for f in "$out"/*.png; do printf '%-28s %s\n' "$f" "$(file -b "$f")"; done
