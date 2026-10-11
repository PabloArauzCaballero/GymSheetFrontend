---
name: repp-diseno
description: Sistema visual, UX móvil y movimiento de la app REPP/GymSheet (Expo 57 · React Native · expo-router · Reanimated 4, tema oscuro, multi-inquilino). Dice dónde vive cada token (apps/mobile/src/theme, packages/design-tokens), qué primitiva usar (src/components/{ui,layout,motion,feedback,list,media,bottom-sheet}.tsx), y fija las reglas concretas — áreas táctiles 44/48 y hitSlop, safe areas, mapa de hápticos, muelles y duraciones, política de acento (volt), escala tipográfica, prohibición de hex fuera de src/theme, lista anti-slop y estados obligatorios. Usar antes de tocar un color, un espaciado, una pantalla o una animación de apps/mobile, y al revisar un PR de UI móvil.
---

# Diseño de REPP (app móvil)

Adaptada de `atlas-diseno`, `atlas-app-movil-ux` y `atlas-movimiento`. Las rutas de Atlas
(`tokens.ts`, `src/ui/`, `marca.ts`) **no existen aquí**; las de esta skill sí.
Fundamentos genéricos: `frontend-ui-design`, `color-systems`, `typography-systems`.
Gate de calidad: `ui-quality-review` (rúbrica 0–2 × 8, aprobar ≥ 13/16 con 1, 4, 5 y 7 en 2).
Plan del rediseño: `PLAN_RUTINAS_REPP/10_CORRECCIONES_TESTFLIGHT_2026-10-10.md` §C5 y
`PLAN_RUTINAS_REPP/evidencia/rediseno/`.

## 1. Dónde vive cada cosa

| Pieza | Ruta real | Notas |
|---|---|---|
| Tokens compartidos web+móvil | `packages/design-tokens/src/index.ts` | `colors`, `lightColors`, `tones`, `spacing`, `radii` (web), `fontSizes`, `durations`, `easings`, `minTouchTarget` (44). Lo toca solo el agente de paquetes. |
| Marcas (inquilinos) | `packages/design-tokens/src/tenants.ts` | `accent`, `accentDim`, `accentContrast`, `accentInkOnDark`, `successOnDark`… por gimnasio. |
| Tema móvil (índice único) | `apps/mobile/src/theme/index.ts` | Rampa de superficies móvil, `radii` móvil (8/12/18/26), `fontSizes` móvil (`lg` 20, `xl` 26, `2xl` 34, `display` 40), `accentPolicy`, `accentContrast()`, `cardPadding` 22, `cardGap` 16, `screenGap` 32, `sectionGap` 12, `iconSizes`, `motion`, `semibold`, `tabularNums`. |
| Marca activa | `apps/mobile/src/theme/tenant.ts` | `colors.volt` **cambia** al resolver la sesión: nunca guardes un color del tema en una constante de módulo. |
| Primitivas | `apps/mobile/src/components/ui.tsx` | `Screen`, `AppText`, `Button` (`primary`/`danger`/`ghost`), `Input`, `textLinkStyle()`. |
| Maquetación | `apps/mobile/src/components/layout.tsx` | `ScrollScreen` (safe areas, `overlay`), `ScreenHeader`, `Section`, `Card`, `Row`, `StatTile`, `Badge`, `Divider`, `Columns`, `useResponsive`. |
| Movimiento | `apps/mobile/src/components/motion.tsx` | `PRESS_SPRING`, `SETTLE_SPRING`, `DURATION`, `PREMIUM_EASING`, `PressableScale`, `EnterUp`, `Reveal`, `SegmentedPill`, `CountUpText`, `Heartbeat`, `useListMotion`. |
| Estados | `apps/mobile/src/components/feedback.tsx` | `Skeleton`, `RowsSkeleton`, `EmptyState`, `ErrorState`. |
| Filas de lista | `apps/mobile/src/components/list.tsx` | `NavRow`, `MetricChip`. |
| Imagen de ejercicio | `apps/mobile/src/components/media.tsx` | `ExerciseImage`, `ExerciseDemo`, `primaryMedia`, `HERO_SIZE`. |
| Hoja inferior | `apps/mobile/src/components/bottom-sheet.tsx` | `BottomSheet` (Modal + velo + X de 44). |

**Descubre antes de crear**: si dos pantallas necesitan lo mismo, va a `src/components`, no se copia.
La app es **solo oscura** (`app.json` → `userInterfaceStyle: "dark"`); `lightColors` existe para la web.

## 2. Color

- **Cero hex/`rgba(` fuera de `src/theme/`** (y de `packages/design-tokens`). Si falta un color, falta un
  token semántico: se añade al tema con su ratio de contraste comentado. Excepción documentada hoy:
  ninguna — los 49 hex y 58 `rgba(` que quedan son deuda (ver `evidencia/rediseno/00_auditoria.md`).
- **Política de acento (`accentPolicy`)**:
  - `colors.volt` es **relleno**: la acción principal de la pantalla (una) y el dato clave (uno).
  - Texto/icono fino en acento sobre superficie → `accentPolicy.ink` (con TOP Fitness el rojo puro da 3,98:1).
  - Glifos decorativos, navegación → `accentPolicy.glyph`. Enlaces secundarios → `accentPolicy.quietLink`.
  - Nunca volt en: números secundarios (el «2» de una celda de semana), puntos de días, avatares
    de iniciales, bordes de tarjetas de lista, chips de filtro, varios botones a la vez.
  - Sobre relleno de acento, el texto es `accentContrast()` (no `colors.background`).
- **Contraste medido (tokens actuales)**: `text` ≥ 12:1 en todas las superficies; `textMuted #8c8c8c`
  5,18:1 sobre `surface` pero **3,92:1 sobre `surfaceHighest`** → no poner texto muted sobre
  `surfaceHighest`; `textDisabled` 1,6–2,5:1 → solo para controles deshabilitados, nunca información;
  `border #333` 1,0–1,7:1 → decorativo, no sirve como único contorno de un control (WCAG 1.4.11 pide 3:1).
- Estado nunca solo por color: «Descarga» lleva palabra, no solo ámbar.

## 3. Tipografía

- Rampa móvil (pt): `xs 12 · sm 14 · md 16 · lg 20 · xl 26 · 2xl 34 · display 40`. Objetivo del
  rediseño (§C5): tipo Apple **34 / 22 / 17 / 15 / 12** con una display propia vía `expo-font`.
- **Mínimo 12** para cualquier texto (hoy hay 9/10/11 sueltos: prohibido). 12 solo para metadatos,
  nunca para lo que la persona tiene que leer para decidir (nombres de día, cargas).
- Jerarquía por tamaño y peso, no por color: cuanto más grande, menos peso (`ScreenHeader` usa
  `semibold` y tracking −3 %). `semibold` sale del tema (Android < 28 sube a 700).
- Cifras que cambian o se comparan: `tabularNums`. Cronómetros: además ancho reservado.
- Dynamic Type: no bloquees `allowFontScaling`; prueba XL sin cortes (`numberOfLines` + `minHeight`, no alturas fijas).

## 4. Espaciado, radios, superficies

- Escala actual 4/8/16/24/32/48 (salto 8→16 demasiado grande); usa los nombrados `cardGap`,
  `cardPadding`, `screenGap`, `sectionGap`. Objetivo §C5: **2-4-8-12-16-20-24-32-40**.
- Radios móviles 8/12/18/26; anidados = radio exterior − padding. Objetivo: `borderCurve: 'continuous'`.
- Superficies: `background → surfaceLowest → surfaceLow → surface → surfaceHigh → surfaceHighest`.
  Una tarjeta plana `surfaceLow` con borde `borderSubtle` (1,19:1) no se lee como objeto: el rediseño
  añade 2–3 niveles de sombra/realce, no más bordes.

## 5. Táctil, safe areas, teclado

- Todo lo tocable: **≥ 44×44** (`minTouchTarget`); objetivo propio de la casa **48** para la acción
  principal y controles de entrenamiento (manos sudadas, en movimiento). Separación mínima 8.
- Control pequeño pegado a texto (X de hoja, chip, «Deshacer»): agranda con `hitSlop` sin mover el
  dibujo; `hitSlop` **no existe en react-native-web** → si la pantalla corre en web, `minHeight` real.
- Hallazgos vigentes: `QuickChip` 36 px, botón «Descubrir» 38 px, «Deshacer última serie» sin altura mínima.
- Safe areas: siempre `ScrollScreen`/`Screen`/`BottomSheet` (suman `insets`). Nada «a pelo».
- La acción principal de una hoja o de un entrenamiento va **fija abajo** (por encima de `insets.bottom`),
  no al final de un scroll.
- Formularios: `KeyboardAvoidingView` ya está en `Screen` y `BottomSheet`; el campo con foco debe quedar visible.

## 6. Hápticos (mapa)

| Momento | Háptico | Dónde |
|---|---|---|
| Acción principal (`Button`) | `impact Medium` al contacto | `ui.tsx` |
| Seleccionar (día, pestaña, segmento, celda) | `selection` | `PressableScale haptic="selection"` |
| Tarjeta/fila que navega | `light` | `PressableScale` por defecto |
| Volver, cerrar, velo | `none` | `haptic="none"` |
| Serie registrada / descanso terminado / sesión finalizada | `notification Success` | `rest-timer.tsx` |
| Error de validación o acción rechazada | `notification Warning` | — |
| Borrar/cancelar sesión confirmado | `notification Error` | — |

Un háptico en cada toque deja de significar nada. No hay hápticos en web.

## 7. Movimiento

Regla: cada animación contesta **«¿de dónde salió esto?»** o **«¿me hizo caso?»**; lo demás es decoración.
- Duraciones (`motion.tsx` `DURATION`): `quick 140` (toque), `standard 280` (tarjeta/panel), `slow 420`
  (cambio de contexto), `exit 180` (salir es más rápido que entrar). Tokens compartidos 120/180/240/320/480/640.
- Curva única `PREMIUM_EASING (0.4, 0, 0.2, 1)`.
- Muelles **sobreamortiguados** (`overshootClamping: true`): `PRESS_SPRING {26, 340, 0.5}`,
  `SETTLE_SPRING {24, 220, 0.7}`, botón `{22, 380, 0.5}`.
- Hundimiento: escala **0.97** en superficies anchas (botón 0.96), **0.94** en iconos pequeños; con
  opacidad leve. Solo `transform`/`opacity`, nunca `width`/`height`/`top` (la barra de recompensa
  anima `width`: deuda).
- Nada se mueve solo: `Heartbeat` (bucle infinito) solo con causa explícita y uno por pantalla.
- `useReducedMotion`: duraciones a 0; el contenido nunca depende de la animación para mostrarse.
- Listas: `EnterUp` con escalonado ≤ 6 elementos × 40 ms; no en cada sección de cada pantalla.

## 8. Estados obligatorios

Toda vista con datos: **cargando** (`Skeleton` con la forma real), **vacío** (`EmptyState` con
acción), **error** (`ErrorState` con reintento), **parcial/offline** (aviso + datos en caché), **sin
permiso** (rutina ajena / invitación pendiente). Prohibido devolver `null` ante un error (hoy: podio
de Comunidad). Botón deshabilitado dice por qué, en tono secundario. Nada de texto en pasado sobre
algo que no ocurrió.

## 9. Anti-slop (cada uno es hallazgo)

- Varias acciones primarias o todos los botones a ancho completo con el mismo peso.
- Volt en todo (puntos, avatares, cifras secundarias, bordes, chips).
- Tarjeta plana repetida (`surfaceLow` + borde casi invisible) como único recurso de agrupación.
- Texto < 12 pt; nombres truncados a 3 letras o 1 línea en celdas de 45 px.
- Etiquetas de sección en MAYÚSCULAS con icono en cada sección.
- `fade-in` de entrada en todo; bucles infinitos sin causa.
- Imagen de ejercicio como cuadrado blanco de 48 px sobre fondo negro (el `#ffffff` de `media.tsx`).
- El mismo dato dicho dos veces (badge «REPP» + texto «Recomendada por REPP»).
- Copy hueco («Tu entrenamiento de un vistazo», «Descubre, crea y entrena tus planes»).
- Hex o tamaños sueltos fuera del tema.
- Solo existe el estado feliz.

## 10. Cómo se prueba

- `npm test -w apps/mobile` (Jest). Pendiente §C5 Paso 2: prueba que prohíbe hex fuera de `src/theme`
  y prueba de contraste AA de pares texto/superficie de cada inquilino.
- Maestro en simulador para recorridos (`animate={false}` en listas si los toques fallan).
- Capturas con `visual-proof`: iPhone SE (375) y 15 Pro Max (430), estados de carga/vacío/error.

## Checklist

- [ ] Una sola acción principal en volt; el resto `ghost` o texto.
- [ ] Sin hex/`rgba(`/tamaños literales fuera de `src/theme`.
- [ ] Texto ≥ 12 pt, contraste ≥ 4,5:1 (calculado, no a ojo); contornos de control ≥ 3:1.
- [ ] Todo lo tocable ≥ 44 (48 en entrenamiento), o `hitSlop` y altura real en web.
- [ ] Safe areas por `ScrollScreen`/`BottomSheet`; CTA de hoja fijo abajo.
- [ ] Hápticos según el mapa; movimiento por tokens; reduce motion respetado.
- [ ] Cargando, vacío, error, offline y sin permiso existen y se vieron.
