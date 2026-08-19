# Assets

Generated from a single vector source by `scripts/generate-app-assets.sh`
(requires `rsvg-convert`). Do not hand-edit the PNGs — re-run the script.

| File | Size | Notes |
| --- | --- | --- |
| `icon.png` | 1024×1024 | Opaque. iOS rejects an icon with an alpha channel. |
| `adaptive-icon.png` | 1024×1024 | Android foreground layer, transparent, mark at 62% so the launcher mask cannot clip it. |
| `splash.png` | 2048×2048 | Mark only; the `#000000` canvas comes from `app.json`. |
| `favicon.png` | 48×48 | Web export. |

They were previously 1×1 placeholders with a malformed IDAT chunk (declared
length 11, actual 13). Any decoder that verifies CRCs rejected them, which is
what made `expo prebuild --platform ios` fail before writing any file.
