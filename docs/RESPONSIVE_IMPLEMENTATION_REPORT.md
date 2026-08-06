# Informe de implementación responsiva — GymSheet Web

> Fecha: 2026-08-06 · Alcance: `apps/web`. Temperatura de trabajo: TEMP 0
> (mínima destrucción, decisiones documentadas).

## 1. Resumen de cambios

Se corrigió el único bloqueante responsivo (la «tabla» de series del
entrenamiento en vivo, que desbordaba y recortaba acciones a 320–390px) y se
aplicó un conjunto de mejoras **centralizadas** (zoom de iOS, áreas seguras,
imágenes, tamaño táctil, cabeceras de panel) más arreglos locales mínimos de
truncado/ajuste. No se alteró ninguna lógica de negocio, validación, ruta,
petición HTTP, permiso por rol ni la identidad visual.

## 2. Problemas detectados → 3. resueltos

| # | Sev. | Problema | Resuelto |
|---|---|---|---|
| 1 | Crítico | Grid de series ~402px min + recorte por `overflow-hidden` | ✅ plantilla encogible compartida |
| 2 | Alto | Auto-zoom iOS por fuente 14px en controles | ✅ `text-base sm:text-sm` en input/select/textarea |
| 3 | Medio | Sin `viewport`/áreas seguras | ✅ `viewport` + `env(safe-area-inset-*)` |
| 4 | Medio | Email desborda tarjeta Identidad | ✅ `min-w-0` + `truncate` |
| 5 | Medio | Puntos de progreso sin wrap | ✅ `flex-wrap` + `min-w-0` |
| 6 | Medio | UUID sin quiebre | ✅ `break-all` |
| 7 | Medio | `<img>` sin object-fit propio | ✅ defaults `size-full max-w-full object-cover` |
| 8 | Medio | 8 cabeceras de panel no apilan | ✅ patrón `flex-col … sm:flex-row` |
| 9 | Medio | Botón `sm` 36px < táctil | ✅ `sm` → 40px (`h-10`) |
| 10 | Bajo | `choice-group` 2 col en mínimo | ✅ `grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3` |

## 4. Archivos modificados

**Fundamentos / primitivos compartidos (impacto global):**
- `src/app/layout.tsx` — `export const viewport` (`viewportFit:'cover'` + `themeColor`).
- `src/shared/components/layout/portal-shell.tsx` — áreas seguras en header, columna de contenido y `main`.
- `src/shared/components/ui/input.tsx`, `select.tsx`, `textarea.tsx` — `text-base sm:text-sm`.
- `src/shared/components/ui/button.tsx` — tamaño `sm` 36→40px.
- `src/shared/components/media/domain-image.tsx` — defaults de `object-fit`/`max-width`.

**Pantalla crítica:**
- `src/features/workouts/components/workout-set-row.tsx` — usa `SET_GRID_COLS`.
- `src/features/workouts/components/workout-exercise-panel.tsx` — cabecera usa `SET_GRID_COLS`.
- `src/features/workouts/components/guided-workout.tsx` — puntos con `flex-wrap`.

**Arreglos locales:**
- `src/features/profile/components/profile-page-client.tsx` — email `truncate`.
- `src/features/training/components/routine-detail-client.tsx` — UUID `break-all`.
- `src/features/onboarding/components/choice-group.tsx` — grid responsivo.

**Paneles admin (cabecera apilable):** `access-device-panel`, `access-point-panel`,
`branch-panel`, `customer-panel`, `maintenance-panel`, `membership-panel`,
`plan-panel`, `room-panel` (8 archivos).

## 5. Componentes creados

- `src/features/workouts/components/set-grid.ts` — constante `SET_GRID_COLS`
  (fuente única de la plantilla de columnas de la tabla de series; garantiza
  lockstep cabecera/filas).
- `e2e/responsive-overflow.spec.ts` — barrido de la matriz de anchos sin desborde.
- `docs/RESPONSIVE_AUDIT_AND_IMPLEMENTATION_PLAN.md`, `RESPONSIVE_DESIGN_SYSTEM.md`,
  `RESPONSIVE_TEST_MATRIX.md`, este informe.

## 6. Componentes refactorizados

`workout-set-row` y `workout-exercise-panel` migrados a `SET_GRID_COLS` (elimina
la plantilla mágica duplicada). Ningún componente fue reemplazado ni migrado de
librería.

## 7. Breakpoints utilizados

Escala Tailwind v4 por defecto (`sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`)
+ el único personalizado justificado `min-[400px]` en `choice-group`. Sin
breakpoints nuevos globales.

## 8. Estrategia aplicada a tablas

Confirmada y conservada: `TableContainer` (`overflow-x-auto`) + `Table`
(`min-w-[680px]`). Las 12 tablas ya la cumplían. La «tabla» de series (que no es
`<table>` sino grid) pasó a una plantilla encogible sin depender del recorte del
contenedor.

## 9. Estrategia aplicada a navegación

Conservada: sidebar en `lg+`; en móvil/tablet, píldoras con scroll horizontal en
el header (activo centrado con `scrollIntoView`, `snap-x`, scrollbar oculto,
`overscroll-behavior-inline: contain`). Se añadieron áreas seguras al header y a
la columna de contenido. Decisión: **no** migrar a drawer (el patrón actual es un
equivalente válido y mantiene todas las rutas accesibles).

## 10. Estrategia aplicada a formularios

1 columna base; controles a 16px en móvil (sin auto-zoom iOS) y 14px en `sm+`;
altura 44px; acción principal apilada a ancho completo en móvil. Sin cambios en
nombres de campos, payloads ni reglas de validación.

## 11. Mejoras de accesibilidad

- Objetivos táctiles: botón `sm` 36→40px (más cercano al piso de 44px).
- Sin auto-zoom en iOS al enfocar campos (mantiene el zoom manual del usuario).
- Áreas seguras (notch) respetadas vía `env(safe-area-inset-*)`.
- Se conservan: foco visible global, `prefers-reduced-motion` completo, Radix para
  foco/Escape en diálogos y tabs, zoom manual permitido (sin `maximum-scale`).

## 12. Pruebas ejecutadas

- **Vitest (unitarias): 21/21 verdes** — incluye `domain-image` (tocado).
- **`tsc --noEmit` (type-check): OK** sobre todo el workspace web.
- **ESLint sobre los 21 archivos tocados: 0 errores/0 warnings.**

## 13. Resultados de build, lint y type-check

| Comando | Resultado |
|---|---|
| `type-check` (`tsc --noEmit`) | ✅ Done |
| `eslint` (archivos tocados) | ✅ exit 0 |
| `test` (vitest) | ✅ 21/21 |
| `source-check` | ⚠️ falla en **código concurrente** (`globals.css` >300 líneas; `tutorials` browser storage) — no en archivos de esta auditoría |
| `build` (`next build`) | ⚠️ falla en **código concurrente** `features/tutorials/engine/positioning.ts` (`Object is possibly 'undefined'`) — no en archivos de esta auditoría |

> Ninguno de mis archivos aparece en los fallos de `source-check`/`build`. El
> `type-check` completo (que también cubre todo el árbol) pasó antes de que el
> proceso paralelo añadiera `positioning.ts`.

## 14. Evidencias visuales

`media-responsive.spec.ts` genera `exercises.png` y `membership.png` (fullPage).
La captura sistemática por matriz de anchos requiere backend activo (ver
`RESPONSIVE_TEST_MATRIX.md` §5). No ejecutada en esta sesión por ausencia de
backend/PostgreSQL.

## 15. Riesgos o limitaciones restantes

1. **Trabajo concurrente en el mismo árbol (importante).** Durante esta sesión,
   otra tarea construía en paralelo las features `tutorials` y `AmbientBackground`
   (`portal-shell` importa `AmbientBackground`; `globals.css` importa
   `background.css`; `packages/{types,schemas,hooks}` modificados). Mis ediciones
   convivieron sin colisión (Git integró a nivel de línea), pero:
   - Los fallos de `source-check` y `build` de arriba **pertenecen a ese trabajo
     en curso** y deben resolverlos sus autores (no se tocaron para evitar
     clobber). Un build limpio requiere que `tutorials/engine/positioning.ts`
     compile.
   - Antes de hacer commit, revisar `git diff` para separar ambos conjuntos de
     cambios si se desean commits independientes.
2. **E2E no ejecutados** aquí (sin backend). `responsive-overflow.spec.ts` está
   listo pero debe correrse con `active.mock` disponible.
3. **Regresión visual automatizada** no configurada (fuera de alcance razonable
   sin infra de snapshots; el barrido de overflow la sustituye parcialmente).
4. El grupo de columnas numéricas de series encoge por debajo de 70px en móvil
   (suposición: números cortos caben; validado a 320px con la nueva plantilla).

## 16. Recomendaciones de mantenimiento

- Usar siempre los primitivos (`Input`/`Select`/`Textarea`/`Button`/`Table…`) y
  `SET_GRID_COLS`; no duplicar plantillas ni tamaños de fuente de controles.
- Regla firme: controles de formulario a 16px en móvil; `<Table>` siempre dentro
  de `<TableContainer>`; texto dinámico con `min-w-0` + truncado.
- Correr `responsive-overflow.spec.ts` en CI (con backend) para prevenir
  regresiones de desborde.
- Vigilar el límite de 300 líneas de `source-check` en `globals.css` al añadir
  tokens (hoy lo excede por el trabajo concurrente de background).
- Para cabeceras de sección nuevas, reutilizar `PageHeader`/`CardHeader` en vez de
  recrear filas `flex justify-between`.
