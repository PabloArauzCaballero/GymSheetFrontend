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

## Cascada: por qué los reinicios van en `@layer base`

Durante un tiempo `globals.css` declaró, **fuera de toda `@layer`**:

```css
h1, h2, h3, p { margin-block: 0; }
```

El CSS sin capa gana a cualquier regla dentro de una `@layer`, y las utilidades
de Tailwind v4 viven en `@layer utilities`. La consecuencia es que **todo `mt-*`
y `mb-*` aplicado a un `<h1>`, `<h2>`, `<h3>` o `<p>` de esta aplicación se
calcula como `0px`**, en silencio: la clase aparece en el marcado, el navegador
la ignora, y el hueco que se ve es el interlineado, no el espaciado elegido.

Se descubrió al rediseñar las pantallas de sesión, donde `mt-6` sobre el titular
rendía cero. La verificación es directa en consola (hoy devuelve `24px`):

```js
getComputedStyle(document.querySelector('h1.mt-6')).marginTop; // "0px"
```

**Regla:** el ritmo vertical se lleva con `gap` en el contenedor (`flex flex-col
gap-*`, `grid gap-*`), nunca con márgenes sobre el propio texto. `gap` no lo toca
ese reinicio y además mantiene el espaciado declarado en un solo sitio.

### Corregido: los reinicios viven ahora en `@layer base`

El problema no se limitaba a los márgenes. Cualquier regla de elemento suelta
ganaba a las utilidades, y en esta hoja había siete:

| Regla | Lo que dejaba muerto |
|---|---|
| `* { border-color }` | todo `border-<color>` |
| `a { color, text-decoration }` | todo `text-<color>`, `underline`, `no-underline` |
| `button, input, select, textarea { font: inherit }` | `text-<tamaño>`, `font-<peso>`, `leading-*`, `tracking-*` en los controles |
| `button { cursor: pointer }` | `cursor-not-allowed` en botones |
| `h1, h2, h3, p { margin-block: 0 }` | `mt-*`, `mb-*`, `my-*` |
| `:focus-visible { outline }` | `focus-visible:outline-*` |
| `html`, `body` | utilidades sobre la raíz y el cuerpo |

Los reinicios pasaron a `@layer base` y los ayudantes de clase (`.glass`,
`.data-label`, `.panel`, `.display-title`…) a `@layer components`. Los primeros
siguen ganando a los valores por defecto del navegador; los segundos ponen la
base y dejan que una utilidad los ajuste. Ambos pierden ahora ante una utilidad,
que es lo que se espera al escribirla.

El cambio movió píxeles en **todas** las pantallas —enlaces que recuperan su
subrayado, botones que recuperan su peso, títulos que recuperan su aire— así que
las referencias visuales de `theme-parity.spec.ts` se regeneraron. Las variantes
`*-win32.png` no se pueden regenerar desde macOS: hay que refrescarlas en una
corrida de Windows o de CI.

**Regla que sigue vigente:** el ritmo vertical se lleva con `gap` en el
contenedor. Es más robusto que el margen y mantiene el espaciado declarado en un
solo sitio.
