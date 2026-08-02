# GymSheet visual system

Sistema de diseño de `apps/web`. La identidad es minimalismo premium con
estructura técnica: lienzo de alto contraste, paneles tonales, bordes finos,
controles compactos, titulares grandes y un único acento fluorescente ("volt").

Desde 2026-08 el sistema es **dual (oscuro + claro)**. El tema oscuro sigue
siendo la identidad por defecto; el claro es un neutro cálido con un acento oliva
legible sobre superficies claras.

## Arquitectura de tokens

La **fuente única de verdad** son las variables CSS de
[`apps/web/src/app/globals.css`](../../apps/web/src/app/globals.css). El tema
oscuro se define en `:root`; el claro sobrescribe las mismas variables bajo
`:root[data-theme='light']`. Como casi todo el estilo consume `var(--…)`, el
cambio de tema se propaga a **todas** las pantallas desde ese único punto.

El paquete [`@gymsheet/design-tokens`](../../packages/design-tokens/src/index.ts)
refleja los mismos valores (`colors`, `lightColors`, `tones`, `spacing`, `radii`,
`fontSizes`, `fontWeights`) para que el cliente Expo comparta la paleta sin
duplicar hex.

### Grupos de tokens

| Grupo | Tokens | Uso |
|---|---|---|
| Superficies | `--background`, `--surface-lowest…highest`, `--surface-sidebar` | lienzo, paneles, controles, hover, cromo lateral |
| Bordes | `--border-subtle`, `--border` | separación estructural |
| Texto | `--text`, `--text-muted`, `--text-disabled` | jerarquía tipográfica |
| Acento | `--volt` (relleno vívido, texto negro), `--volt-dim` (hover), `--accent-ink` (acento **legible** para texto/iconos) | acciones y énfasis |
| Estado plano | `--danger`, `--warning`, `--success` | texto/iconos de estado |
| Tonos semánticos | `--{success,warning,danger,info}-{bg,border,text}`, `--danger-surface` | badges, alertas, chips |
| Cromo | `--header-bg`, `--overlay`, `--focus-ring`, `--grid-line`, `--page-glow`, `--sheen` | header translúcido, overlays, foco, rejilla, brillos |
| Elevación | `--shadow-sm/md/lg` | profundidad moderada |
| Radios | `--radius-sm` (4), `--radius-md` (6), `--radius-lg` (8), `--radius-xl` (14) | esquinas consistentes |

> Clave del tema claro: `--volt` se mantiene como **relleno** vívido (con texto
> negro), pero el texto/icono de acento usa `--accent-ink` (oliva oscuro en claro,
> volt en oscuro) para garantizar contraste legible. Por eso el código usa
> `text-[var(--accent-ink)]` en acentos de texto y reserva `--volt` para rellenos.

### Utilidades Tailwind (@theme inline)

`globals.css` registra los tokens con `@theme inline`, exponiendo utilidades que
emiten `var(--…)` y por tanto siguen siendo reactivas al tema: `bg-surface`,
`bg-background`, `text-fg`, `text-muted`, `text-accent`, `border-line`, etc. El
código existente también consume tokens vía valores arbitrarios
(`text-[var(--text-muted)]`), patrón válido y equivalente.

## Theming (claro/oscuro)

- Persistencia en **cookie** `gymsheet-theme` (no Web Storage — regla del
  proyecto). Ver [`theme-script.ts`](../../apps/web/src/shared/theme/theme-script.ts).
- **Sin FOUC**: un script en `<head>` fija `data-theme` antes del primer pintado,
  leyendo la cookie o, en su defecto, `prefers-color-scheme`.
- [`ThemeProvider`](../../apps/web/src/shared/theme/theme-provider.tsx) expone el
  tema con `useSyncExternalStore` (sin `setState` en efectos, sin desajuste de
  hidratación). [`ThemeToggle`](../../apps/web/src/shared/components/layout/theme-toggle.tsx)
  está en el header del portal.

## Componentes

- **Atoms** (`shared/components/ui/`): `Button`, `Input`, `Textarea`, `Select`,
  `Badge`, `Card`, `Field`, `Table`, `Tabs`, `Dialog`, `Pagination`, `MetricCard`.
- **Feedback** (`shared/components/feedback/`): `EmptyState`, `ErrorPanel`,
  `LoadingPanel` (skeleton con shimmer).
- **Layout/Organisms** (`shared/components/layout/`): `PortalShell` (sidebar +
  header + main), `Brand`, `PageHeader`, `RouteProgress`, `ThemeToggle`.
- **Motion** (`shared/components/motion/`): `Reveal`, `CountUp`.

Todo acento de estado usa los tonos semánticos, no hex sueltos. La única
excepción deliberada es `app/global-error.tsx`, que se renderiza fuera del layout
raíz (sin variables de tema) y conserva un fallback oscuro autónomo.

## Tipografía

Stack `Hanken Grotesk` (vía `next/font`) con fallback a Inter y sans del sistema.
`.display-title`, `.data-label` y `.data-value` (cifras tabulares) estandarizan la
jerarquía.

## Movimiento

Utilidades en [`motion.css`](../../apps/web/src/app/motion.css) con keyframes en
[`animations.css`](../../apps/web/src/app/animations.css); sin dependencias
externas. Brillos (`--sheen`) y shimmer se adaptan al tema. `prefers-reduced-motion`
reduce toda animación a ~0.

## Accesibilidad

- Foco siempre visible (`--focus-ring`, contrasta en ambos temas).
- Objetivos táctiles ≥ 44px (`minTouchTarget`).
- Contraste: `--accent-ink` garantiza legibilidad del acento en tema claro.
- HTML semántico; tablas con overflow horizontal en pantallas estrechas.
- Botones de carga exponen estado pendiente; alertas usan `role="alert"`.

## Pendientes reales

- El patrón de "caja de error de formulario"
  (`border-[var(--danger-border)] bg-[var(--danger-surface)] …`) se repite en ~6
  formularios; ya está tokenizado pero conviene extraerlo a un átomo `<FormError>`
  para eliminar la duplicación de marcado.
