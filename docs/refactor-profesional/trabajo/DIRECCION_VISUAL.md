# Dirección visual — Fase 03

> GymSheet ya tiene una dirección visual aceptada y en ejecución (ADR-0002 + ADR-0003, 2026-09-10),
> alineada 1:1 con el criterio "claridad con profundidad moderada" de
> `ESPECIFICACION_OBJETIVO.md` y con la skill `apple-premium-ui`. Esta fase la adopta como
> baseline — no la reinicia — y cierra el residual que quedaba pendiente.

## Baseline aceptado

- **ADR-0002** (`docs/decisions/ADR-0002-dual-theme-token-system.md`): tokens CSS por tema
  (`:root` oscuro, `:root[data-theme='light']` claro), tokens de tono semánticos
  (`--{success,warning,danger,info}-{bg,border,text}`), `--accent-ink` para texto de acento
  legible en claro, cookie `gymsheet-theme` (no Web Storage), sin FOUC.
- **ADR-0003** (`docs/decisions/ADR-0003-apple-premium-visual-direction.md`): `--volt` como único
  acento, restringido a una acción dominante + un dato por región, prohibido como
  superficie/borde/glow/sombra; superficies por luminancia (lienzo → elevada → overlay → foco);
  espaciado `4·8·12·16·24·32·48·64·96`; tipografía de sistema con tracking/line-height/peso
  calibrados por tamaño; movimiento tokenizado (`--dur-1..6`, `--ease-*`).

## Estado real verificado en esta pasada (no solo memoria)

| Criterio de ADR-0003 | Estado verificado | Evidencia |
|---|---|---|
| `font-bold` reservado, resto en `font-semibold` | **Cerrado.** Los 2 archivos que quedaban (`comunidad-client.tsx`, `portal-shell.tsx` — badges numéricos de 10-11px) se pasaron a `font-semibold` en esta pasada. `tsc --noEmit` limpio después del cambio. | `git diff` de esta sesión |
| `pageGlow`/`sheen`/`aurora` fuera de infraestructura de tema | **Una excepción revisada y aceptada:** `progression-celebration-stage.tsx` usa `sheen` para la animación de subida de nivel — es un momento puntual de celebración, no cromo rutinario; se juzga coherente con la propia regla (que target "cromo de producto", no un logro infrecuente). No se tocó. | Lectura de código, no cambiado |
| Gradientes decorativos sin propósito | **Ninguno encontrado.** Los 5 usos de `bg-gradient-to-*` restantes son scrims de legibilidad sobre fotos (`exercise-card`, `directory-card-face`, `story-chrome`), un fill de barra de progreso con dos tonos del mismo acento (`tutorial-progress-bar`), y un skeleton de carga neutro (`domain-image`) — todos funcionales, con tokens, no decoración. | `grep` + lectura de cada archivo |
| Regla del acento (`--volt` no en superficie/borde/glow) | No re-auditado exhaustivamente en esta pasada (memoria de proyecto lo da por hecho en fases 0-5); sin evidencia de regresión en los archivos tocados hoy. | No ejecutado — pendiente de barrido completo si se requiere certeza total |
| Pantalla patrón demostrada con todos sus estados | Parcial: dashboard, `/admin` grid, `/sistema`, `/sistema/auditoria`, `/workouts` (desktop + 375px) capturados con datos reales en esta pasada (`trabajo/evidencia/`). Faltan estados de error/carga explícitos con captura. | `trabajo/evidencia/*.png` |

## Qué no se re-litiga

No se vuelve a decidir el acento, la escala tipográfica ni el sistema de tokens: ya están
aceptados, documentados y con evidencia de verificación previa (`type-check`/`lint`/`build`
verdes, según memoria de proyecto del 2026-09-10). Reabrirlos sin una razón nueva iría contra la
regla de `PLAN_MAESTRO.md`: "un hallazgo del piloto puede devolver una decisión a fases 02-05... no
rehacer lo que sigue siendo válido."

## Pendiente real de esta fase

- QA visual en navegador de las ~45 rutas del inventario contra la regla del acento — se hizo un
  muestreo (8 pantallas, ver `trabajo/evidencia/`), no el barrido completo.
- Contraste medido con herramienta (no solo visual) sobre fondo real, transparencia incluida, en
  ambos temas — pendiente para fase 09 (accesibilidad), donde tiene más sentido correrlo junto al
  resto de axe-core.
