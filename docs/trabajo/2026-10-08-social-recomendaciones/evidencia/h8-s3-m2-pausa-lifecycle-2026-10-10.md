# H8.S3.M2 — Pausa de reproducción por lifecycle (2026-10-10)

El visor pausa el video y el temporizador cuando el navegador se oculta, recibe `pagehide` o la app móvil pasa a `inactive`/`background`. Al volver a foreground, sigue pausado; la persona reanuda desde el control del visor.

## Verificación

- Web: hook `usePagePlaybackPause`, pruebas de visibility/pagehide 2/2; type-check del monorepo y ESLint focal PASS.
- Móvil: transición AppState cubierta por 3 pruebas focales; type-check y ESLint focal PASS.
- `git diff --check` PASS.

No se ejecutó emulador, browser E2E ni PAIR. El cambio queda implementado en ambos clientes; falta la aceptación física/PAIR definida por el plan.
