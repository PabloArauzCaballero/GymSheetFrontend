# Auditoría responsiva e Plan de implementación — GymSheet Web

> Fecha: 2026-08-06 · Alcance: `apps/web` (cliente Next.js). El cliente móvil
> Expo (`apps/mobile`) queda fuera: es nativo y no comparte el árbol de UI web.

## 1. Resumen ejecutivo

La aplicación web ya estaba en un estado **maduro y mayormente mobile-first**: no
usa `100vw`, `w-screen` ni `window.innerWidth`; tiene sistema de tokens dual
(oscuro «volt» por defecto + claro), `min-width:320px` global, `100dvh`,
`prefers-reduced-motion` completo, y todas las tablas encapsuladas en un
contenedor con scroll horizontal.

La auditoría (una lectura manual de los primitivos + tres barridos automáticos
por áreas) encontró **un único bloqueante real** y un conjunto acotado de mejoras
de saneamiento y accesibilidad táctil. No se detectó scroll horizontal accidental
sistémico, contenido cortado por anchos fijos ni grids sin colapso — salvo el
caso descrito abajo.

**Bloqueante (Crítico):** la «tabla» de series del entrenamiento en vivo
(`workout-set-row` + `workout-exercise-panel`) usaba una plantilla de columnas
rígida `grid-cols-[44px_repeat(3,minmax(70px,1fr))_92px]` con un mínimo ≈402px,
imposible de encajar en 320–390px. Peor: el `<article>` contenedor tiene
`overflow-hidden`, por lo que las columnas desbordadas (valor de RIR + botones de
editar/eliminar) quedaban **recortadas e intocables** en móvil, en la pantalla
más importante del producto.

## 2. Stack detectado

| Área | Tecnología |
|---|---|
| Framework | Next.js **16.2** (App Router, RSC) |
| UI runtime | React **19.2** |
| Lenguaje | TypeScript estricto (monorepo) |
| Estilos | **Tailwind CSS v4** (`@tailwindcss/postcss`, `@theme inline`) + CSS vars |
| Tokens | `@gymsheet/design-tokens` (fuente única, espeja las CSS vars) |
| Primitivos accesibles | Radix UI (`react-dialog`, `react-tabs`) |
| Iconos | `lucide-react` |
| Formularios | `react-hook-form` + `zod` (`@hookform/resolvers`) |
| Estado servidor | `@tanstack/react-query` |
| Toasts | `sonner` |
| Test unitario | Vitest + Testing Library + jsdom |
| Test E2E | Playwright (`chromium` + `Pixel 7`), `@axe-core/playwright` |
| Guard de código | `scripts/source-check.mjs` (límite 300 líneas/archivo, no browser storage de sesión) |

Estructura: `app/(auth)` y `app/(portal)` como grupos de ruta; lógica por
feature en `src/features/*`; primitivos y layout compartidos en
`src/shared/components/*`; el navegador sólo consume rutas BFF `/api/*`.

## 3. Inventario de rutas (portal, rol atleta + admin)

`/dashboard`, `/workouts`, `/workouts/new`, `/workouts/[id]`, `/plans`,
`/routines`, `/exercises`, `/exercises/new`, `/exercises/[id]`,
`/exercises/[id]/edit`, `/membership`, `/access`, `/notifications`, `/profile`,
`/onboarding`; admin: `/admin`, `/admin/equipment`, `/admin/exercises`,
`/admin/facilities`, `/admin/membership`, `/admin/access`. Auth: `/login`,
`/register`. Todas las `page.tsx` son envoltorios de servidor delgados que
delegan en componentes de feature.

## 4. Inventario de componentes críticos (compartidos)

`portal-shell` (layout + navegación), `page-header`, `dialog`, `table` +
`table-container`, `tabs`, `button`, `input`, `select`, `textarea`, `field`,
`card`, `metric-card`, `badge`, `pagination`, `empty-state`, `error-panel`,
`loading-panel`, `domain-image`.

## 5–7. Problemas encontrados, severidad y componentes afectados

| # | Severidad | Componente / archivo | Problema |
|---|---|---|---|
| 1 | **Crítico** | `workouts/workout-set-row.tsx`, `workouts/workout-exercise-panel.tsx` | Grid de series rígido (~402px min) → desborde + recorte de acciones intocables en 320–390px |
| 2 | Alto | `ui/input.tsx`, `ui/select.tsx`, `ui/textarea.tsx` | Fuente 14px en controles → auto-zoom de iOS Safari al enfocar |
| 3 | Medio | `app/layout.tsx` | Sin `viewport` export → sin `viewport-fit=cover` ni soporte de áreas seguras (notch) |
| 4 | Medio | `profile/profile-page-client.tsx` | Email largo sin `truncate`/`min-w-0` → desborde en tarjeta Identidad a 320px |
| 5 | Medio | `workouts/guided-workout.tsx` | Fila de puntos de progreso sin `flex-wrap` → desborde con muchas (~12+) rutinas |
| 6 | Medio | `training/routine-detail-client.tsx` | UUID crudo del propietario sin `break-all` → desborde a 320px |
| 7 | Medio | `media/domain-image.tsx` | `<img>` sin `object-fit`/`max-width` propios → distorsión/desborde si el llamador los omite |
| 8 | Medio | 8× paneles admin (`*-panel.tsx`) | Cabeceras `flex items-center justify-between` sin apilar en móvil → cabeceras apretadas |
| 9 | Medio | `ui/button.tsx` (tamaño `sm`) | 36px de alto < umbral táctil cómodo de 40px |
| 10 | Bajo | `onboarding/choice-group.tsx` | `grid-cols-2` fijo en el ancho mínimo → celdas ~140px con etiquetas apretadas |

**Verificado OK (sin acción):** todos los grids multi-columna de features llevan
prefijos responsivos y colapsan a 1 columna; las 12 tablas están envueltas en
`TableContainer` (scroll horizontal correcto); `TabsList` hace scroll horizontal;
`Dialog` usa `w-[calc(100%-2rem)] max-w-xl max-h-[90dvh]` con scroll interno;
`PageHeader` ya apila y usa `flex-wrap`; `prefers-reduced-motion` neutraliza
animaciones globalmente.

## 8. Estrategia de solución

Priorizar soluciones **centralizadas** sobre parches por pantalla:

- **#1** — extraer la plantilla de columnas a un módulo único
  (`workouts/set-grid.ts` → `SET_GRID_COLS`) que consumen cabecera y filas en
  lockstep; hacer las pistas encogibles (`minmax(0,1fr)` + `auto`) para entrar en
  320px sin depender del recorte del padre.
- **#2** — subir la fuente de los controles a 16px en móvil y bajarla a 14px en
  `sm+` (`text-base sm:text-sm`) en los tres primitivos de formulario.
- **#3** — añadir `export const viewport` con `viewportFit:'cover'` + `themeColor`
  y aplicar `env(safe-area-inset-*)` en el shell (header, columna de contenido,
  bottom del main).
- **#7, #9** — arreglos en el primitivo (defaults de imagen; `sm` a 40px) que se
  propagan a todos los usos.
- **#8** — misma clase de apilado responsivo en las 8 cabeceras (patrón idéntico).
- **#4, #5, #6, #10** — arreglos locales mínimos (`truncate`/`min-w-0`/`flex-wrap`/`break-all`/`grid-cols-1`).

## 9. Riesgos de regresión

- Cambiar la plantilla del grid de series podría desalinear cabecera/filas → se
  mitiga usando **una** constante compartida.
- `text-base sm:text-sm` cambia ligeramente la densidad de formularios en móvil
  (deseado: mejor legibilidad + sin zoom).
- `sm` de botón 36→40px altera densidad de barras de acción (mejora alineación
  con inputs de 44px).
- **Concurrencia:** durante esta sesión otra tarea modificaba en paralelo el
  árbol de trabajo (feature `tutorials` + `AmbientBackground`, `globals.css`,
  `packages/*`). Los fallos de `source-check` (`globals.css` >300 líneas;
  `tutorials` browser storage) y cualquier fallo de build provienen de ese
  trabajo en curso, no de esta auditoría. Ver
  `RESPONSIVE_IMPLEMENTATION_REPORT.md` §Riesgos.

## 10. Orden de implementación

1. Fundamentos (viewport/áreas seguras, zoom iOS). 2. Bloqueante #1. 3. Primitivos
compartidos (#7, #9). 4. Paneles admin (#8). 5. Pantallas específicas (#4–#6, #10).
6. Pruebas E2E de desborde. 7. Validación + documentación.

## 11. Criterios de aceptación

Sin scroll horizontal en 320–2560px en rutas autenticadas; series usables y
acciones tocables a 320px; formularios sin auto-zoom en iOS; tablas con scroll;
type-check, lint y test verdes en los archivos tocados; documentación entregada.

## 12. Pruebas necesarias

- Unitarias existentes (21) siguen verdes.
- Nueva `e2e/responsive-overflow.spec.ts`: barrido de la matriz de anchos sin
  desborde (requiere backend).
- `media-responsive.spec.ts` existente sigue cubriendo imágenes + overflow.

## 13. Decisiones que deben conservarse

- Navegación móvil = píldoras con scroll horizontal en el header (equivalente
  válido al drawer; mantiene todas las rutas accesibles y el elemento activo se
  centra con `scrollIntoView`). **No** migrar a drawer.
- Estrategia de tablas = scroll horizontal con `min-w-[680px]` + `TableContainer`.
- Identidad visual (tokens «volt», tipografía Hanken Grotesk) intacta.

## 14. Suposiciones realizadas

- El grupo de columnas numéricas puede encoger por debajo de 70px en móvil sin
  perder usabilidad (números cortos: peso/reps/RIR).
- Botón de acción principal a ancho completo en móvil (apilado) es aceptable y
  preferible para el táctil (coincide con el patrón de `PageHeader`).
- No ejecutar E2E aquí por falta de backend/PostgreSQL (regla del proyecto).
