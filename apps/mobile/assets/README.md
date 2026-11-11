# Assets (placeholders)

`icon.png`, `splash.png`, `adaptive-icon.png` and `favicon.png` are 1×1 placeholder
PNGs so the Expo config resolves. **Replace them before any store build:**

- `icon.png` — 1024×1024, square, no transparency.
- `adaptive-icon.png` — 1024×1024 foreground (Android adaptive icon).
- `splash.png` — centered logo on `#000000` (see `app.json`).
- `favicon.png` — 48×48 for web export.

## Splash y entrada de marca

La entrada animada (`src/splash/`) arranca desde un fondo liso `#000000`, sin
nada dibujado, y arma la marca a partir de ahí.

**El relevo con el splash nativo no está controlado.** `expo-splash-screen` no
está instalado, así que las llamadas `SplashScreen.preventAutoHideAsync()` /
`hideAsync()` de `app/_layout.tsx` no hacen nada: el sistema retira el splash
cuando React pinta su primera vista. Lo único que hace invisible ese cambio es
que el fondo sea `#000000` en los dos lados: `splash.backgroundColor` de
`app.json` y `colors.background` en el primer cuadro de JavaScript
(`sequence.test.ts` exige que coincidan).

Consecuencias:

- Mientras `splash.png` sea solo fondo, no hay salto. Si se sustituye por una
  imagen con logotipo, ese logotipo desaparecerá de golpe antes de que la
  entrada lo vuelva a armar. O se deja el splash nativo en fondo liso, o se
  ajusta el primer cuadro de `src/splash/sequence.ts` para que coincida con la
  imagen.
- Para un relevo controlado de verdad (retener el splash nativo hasta que la
  entrada esté en pantalla) hay que instalar `expo-splash-screen`, añadir su
  plugin en `app.json` y generar una compilación nativa nueva. El código de
  `_layout.tsx` ya hace las llamadas; no requiere más cambios.
