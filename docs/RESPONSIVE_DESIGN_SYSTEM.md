# Sistema de diseño responsivo — GymSheet Web

Guía de referencia para mantener la web consistente en todos los tamaños. Refleja
el sistema **ya existente** más las convenciones reforzadas por esta auditoría.

## 1. Filosofía

- **Mobile-first.** Estilos base = móvil; se amplía con prefijos `sm:`/`md:`/`lg:`/`xl:`.
- **El contenido decide los breakpoints**, no el nombre del dispositivo.
- **CSS antes que JS.** Nada de responsividad basada en `window.innerWidth`.
- **Centralizar antes que parchear.** La lógica repetida vive en un primitivo,
  una utilidad o una constante compartida (p. ej. `SET_GRID_COLS`).

## 2. Breakpoints (Tailwind v4, por defecto)

| Prefijo | min-width | Uso típico |
|---|---:|---|
| (base) | 0 | Móvil (≥320px garantizado por `html{min-width:320px}`) |
| `min-[400px]:` | 400px | Salto puntual entre móvil pequeño y estándar |
| `sm:` | 640px | Móvil grande / tablet vertical: 1→2 col, filas en línea |
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Sidebar visible; layout de escritorio |
| `xl:` | 1280px | Densidad de escritorio amplia |
| `2xl:` | 1536px | Monitores grandes |

Reutiliza esta escala. No inventes breakpoints por diferencias mínimas; el único
personalizado justificado es `min-[400px]` en `choice-group`.

## 3. Contenedores y layout

- **Shell** (`portal-shell`): `lg:grid lg:grid-cols-[260px_minmax(0,1fr)]`.
  - Sidebar fijo sólo en `lg+`; en móvil/tablet se colapsa y la navegación pasa a
    píldoras con scroll horizontal en el header.
  - La columna de contenido usa `min-w-0` (evita que hijos con contenido largo la
    ensanchen) + `pl/pr env(safe-area-inset-*)`.
- **Ancho de contenido**: `main` con `mx-auto w-full max-w-[1440px]` y padding
  lateral fluido `px-4 sm:px-8 lg:px-12`; padding inferior + `env(safe-area-inset-bottom)`.
- **`min-w-0`** es obligatorio en cualquier hijo flex/grid que contenga texto
  potencialmente largo (emails, nombres, UUIDs) junto a `truncate`/`break-all`.

## 4. Áreas seguras (notch)

Habilitadas por `viewport = { viewportFit: 'cover' }` en `app/layout.tsx`. Se
aplican con `env(safe-area-inset-*)`:

- Header: `pt-[env(safe-area-inset-top)]`.
- Columna de contenido: `pl/pr-[env(safe-area-inset-left/right)]`.
- `main`: padding inferior `calc(<base> + env(safe-area-inset-bottom))`.

En navegador normal los insets valen 0 → sin cambio visual.

## 5. Tokens de diseño

Fuente única: `packages/design-tokens` + CSS vars en `globals.css` (`@theme inline`
las expone como utilidades reactivas al tema: `bg-surface`, `text-muted`,
`border-line`, `text-accent`, …). No hardcodees hex; usa `var(--…)` o la utilidad.

- **Espaciado**: `xs 4 · sm 8 · md 16 · lg 24 · xl 32 · 2xl 48`.
- **Radios**: `sm 4 · md 6 · lg 8 · xl 14`.
- **Altura de controles**: input/select/textarea = `h-11` (44px). Botón `sm 40 · md 44 · lg 52`, `icon 40`.
- **Área táctil mínima**: 44px (token `minTouchTarget`); 40px es el piso aceptable.

## 6. Tipografía

- Familia: Hanken Grotesk (`--font-hanken`).
- `.display-title` usa `clamp(2.25rem, 5.5vw, 3.5rem)` (fluida).
- **Controles de formulario: 16px en móvil, 14px en `sm+`** (`text-base sm:text-sm`)
  para evitar el auto-zoom de iOS al enfocar. Regla firme para todo `<input>`,
  `<select>`, `<textarea>`.
- Texto largo/dinámico: `truncate` (una línea), `line-clamp-N`, `break-words` o
  `break-all` (IDs/URLs). Nunca reducir tamaño para «hacer caber».

## 7. Patrones por componente

### Formularios
- 1 columna base; `sm:grid-cols-2`/etc. sólo con espacio real.
- Etiquetas vía `<Field>` (`data-label` + error/hint accesibles).
- Acción principal apilada a ancho completo en móvil, en línea desde `sm`.

### Tablas
Estrategia estándar: `<TableContainer>` (`overflow-x-auto scrollbar-thin`) →
`<Table>` (`min-w-[680px]`). **Toda** `<Table>` debe ir dentro de un
`TableContainer`. Conserva orden/filtros/paginación/acciones.

### La «tabla» de series (entrenamiento)
Cabecera y filas comparten `SET_GRID_COLS`
(`grid-cols-[32px_repeat(3,minmax(0,1fr))_auto]`). Nunca dupliques la plantilla:
impórtala de `features/workouts/components/set-grid.ts`.

### Modales (`Dialog`)
`w-[calc(100%-2rem)] max-w-xl max-h-[90dvh]` + `overflow-y-auto`. Radix gestiona
foco/Escape/retorno de foco.

### Grids de tarjetas
Progresión: 1 col móvil → `sm:grid-cols-2` → `xl:grid-cols-3+`. Alturas flexibles,
`overflow-hidden` para radios, `min-w-0`/`line-clamp` en textos.

### Imágenes (`DomainImage`)
Defaults propios `size-full max-w-full object-cover` (el llamador puede
sobrescribir con `object-contain`). Contenedor con `overflow-hidden` + shimmer;
`loading="lazy"`, `decoding="async"`.

### Cabeceras de sección/panel
`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between` (patrón de
`PageHeader`/`CardHeader`). Nunca `flex items-center justify-between` sin apilar.

### Botones y acciones
Fila de acciones con `flex flex-wrap gap-2`. Iconos siempre con `aria-label`.
Hover nunca es el único canal (las acciones que aparecen en hover en `sm+` están
visibles por defecto en móvil).

## 8. Accesibilidad

- Foco visible global (`:focus-visible`), Radix para diálogos/tabs/menús.
- `prefers-reduced-motion: reduce` neutraliza animaciones y scroll suave.
- Zoom permitido (sin `maximum-scale`); objetivo funcional a 200%.
- HTML semántico primero; ARIA sólo cuando aporta.

## 9. Anti-patrones (prohibido)

`100vw`/`w-screen` para anchos completos · anchos/altos fijos en px para layout ·
`window.innerWidth` para decisiones visuales · media queries por diferencias
mínimas · duplicar árboles móvil/escritorio · `<Table>` sin `TableContainer` ·
fuente <16px en controles · hover como única interacción · texto dinámico sin
`min-w-0` + truncado.
