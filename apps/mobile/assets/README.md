# Assets (placeholders)

`icon.png`, `splash.png`, `adaptive-icon.png` and `favicon.png` are 1×1 placeholder
PNGs so the Expo config resolves. **Replace them before any store build:**

- `icon.png` — 1024×1024, square, no transparency.
- `adaptive-icon.png` — 1024×1024 foreground (Android adaptive icon).
- `splash.png` — centered logo on `#000000` (see `app.json`).
- `favicon.png` — 48×48 for web export.

## Splash y entrada de marca

La entrada animada (`src/splash/`) arranca desde el fondo liso `#000000`, sin
nada dibujado, y arma la marca a partir de ahí. Mientras `splash.png` sea solo
fondo, el relevo entre el splash nativo y el primer cuadro de JavaScript no se
nota. Si se sustituye por una imagen con logotipo, ese logotipo desaparecería
un instante antes de que la entrada lo vuelva a armar: o se deja el splash
nativo en fondo liso, o se ajusta el primer cuadro de `src/splash/sequence.ts`
para que coincida con la imagen. `splash.backgroundColor` de `app.json` debe
seguir igual a `colors.background` (lo exige `sequence.test.ts`).
