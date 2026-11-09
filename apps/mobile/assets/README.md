# Assets

Generados en alta resolución (supersampling 4x) con los colores de marca de
`packages/design-tokens` (`#c3f400`, degradado `#d8ff33 → #a8d400`):

- `icon.png` — 1024×1024, cuadrado, sin transparencia (el sistema aplica su máscara).
- `adaptive-icon.png` — 1024×1024, baldosa dentro de la zona segura de Android.
- `splash.png` — 1284×2778, baldosa al 28 % del ancho y centrada al 46 % del alto,
  sobre `#000000` con un halo volt. `src/components/launch-intro.tsx` depende de
  esa geometría para continuar el splash sin corte: si se cambia una, se cambia la otra.
- `brand-mark.png` — la baldosa sola (360 px, @3x de 120 dp) para la app.
- `glow.png` — caída radial blanca con dither, teñida por `ambient.tsx`.
- `favicon.png` — 48×48 para la exportación web.
