# Matriz de movimiento — app móvil

Entregable de la fase 07 ([`fases/07_MOVIMIENTO_Y_FEEDBACK.md`](../fases/07_MOVIMIENTO_Y_FEEDBACK.md)) para
`apps/mobile`. Complementa a `MOVIMIENTO.md`, que cubre sólo la web. Fecha: 2026-10-02.

## Criterio

Salió de leer, antes de tocar nada: `apple-premium-ui`, `ui-ux-pro-max` (§7 y `pro-rules`), `motion-design`
(+ `context-adaptation`), `animation-principles`, `motion-art-direction`, la especificación
[05](../especificaciones/05_MOVIMIENTO_Y_MICROINTERACCIONES.md) y la guía de React Native.

Cada cambio se aprobó contra cinco preguntas; si una respuesta era «no», no se animó:

1. ¿Comunica un estado o una causa (qué cambió, de dónde viene)?
2. ¿Lo notaría una persona con el pulgar, no sólo quien mira el código?
3. ¿Se interrumpe y se revierte bien (tocar otra cosa a mitad)?
4. ¿Funciona igual sin la animación?
5. ¿Respeta «Reducir movimiento»?

Personalidad: **Premium** (ya fijada en `motion.tsx`): se asienta, no rebota. Móvil ×0,8, máximo 1–2
propiedades por elemento, solo `transform` y `opacity` salvo en cosas diminutas.

## Tokens (fuente única: `src/components/motion.tsx`)

| Token | Valor | Para qué |
|---|---|---|
| `PREMIUM_EASING` | `cubic-bezier(0.4, 0, 0.2, 1)` | Casi todo |
| `DURATION.quick / standard / slow / exit` | 140 / 280 / 420 / 180 ms | Pulsación · entrada · cambio de contexto · salida (≈ 64 % de la entrada) |
| `PRESS_SPRING` | damping 26 · stiffness 340 · mass 0,5 · sin rebote | Responder a un dedo |
| `SETTLE_SPRING` | damping 24 · stiffness 220 · mass 0,7 · sin rebote | Lo que se asienta en un sitio (píldoras, anillo del tour) |

`PRESS_SPRING` y `SETTLE_SPRING` ahora se exportan; el icono de pestañas y el checkbox dejaron de llevar un
muelle propio (el del checkbox rebotaba, `damping: 12`).

**Reducir movimiento se lee en vivo** (`useReduceMotion`, escucha `reduceMotionChanged`). El
`useReducedMotion` de Reanimated sólo lee el ajuste al arrancar —lo dice su propia documentación—, así que
los primitivos compartidos ya no lo usan.

### Decisión: los hápticos NO dependen de «Reducir movimiento»

El plan original proponía apagarlos con esa opción. Se descartó: los hápticos no son movimiento, y apagarlos
quita a quien más lo necesita (baja visión) la confirmación que le sustituye a la animación. Lo que sí se
unificó es **cuándo** vibra: `PressableScale` acepta `haptic: 'none' | 'light' | 'selection' | 'medium'` y
las acciones que sólo navegan (volver, cerrar) pasan a `'none'`.

## Primitivos

| Primitivo | Qué hace | Reducido |
|---|---|---|
| `PressableScale` | Hundimiento (`scaleTo`, 0,97 por defecto; 0,88–0,94 para iconos) + atenuado 12 %, háptico configurable, rol y estado de accesibilidad, `hitSlop`, `onLongPress` | Sin escala; queda el atenuado |
| `Reveal` | Esqueleto → contenido: fade + 8 px, 280 ms | Fade de 1 ms |
| `useListMotion` | Entrada / salida (180 ms) / reacomodo de filas | Sin viaje |
| `SegmentedPill` + `SegmentLabel` | La píldora activa **se desliza** (`SETTLE_SPRING`); el color de la etiqueta cambia con ella | La píldora salta |
| `BadgePop` | Escala 1 → 1,28 → 1 cuando cambia el número; no late al montar | Sin golpe |

## Controles

| Control | Antes | Ahora | Háptico | Evidencia |
|---|---|---|---|---|
| Barra de pestañas | Sólo escala del icono activo | + toque de selección al cambiar (no al pulsar la activa) | selection | Tipos/lint. **Sin comprobar en dispositivo** |
| `BackLink` | Opacidad 0,6 | `PressableScale` 0,94 | none | Tipos/lint |
| Checkbox | Sin respuesta; marca con rebote | `PressableScale` + marca sin rebote | selection | Tipos/lint |
| Segmentado Puntos/Racha (Trayectoria) | El fondo saltaba | `SegmentedPill` | selection | Tipos/lint |
| Segmentado lista/tarjetas (Comunidad) | El fondo saltaba | `SegmentedPill` (iconos) | selection | Tipos/lint |
| Insignia de interacciones | Cambiaba sin avisar | `BadgePop` | — | Tipos/lint |
| Chat: 4 iconos del compositor, apodo, mensajes especiales | `Pressable` mudos de 24 px | `PressableScale` + `hitSlop` | none (vista única: selection) | Tipos/lint |
| Chat: mensajes nuevos | Aparecían de golpe | Entran (fade + 10 px); sólo los posteriores a abrir el hilo | — | Tipos/lint |
| Chat: icono «vista única» | Cambio instantáneo | Fundido entre iconos | selection | Tipos/lint |
| Series (Entreno) | Filas aparecían/desaparecían | `useListMotion` | — | Tipos/lint |
| Temporizador de descanso | Aparecía de golpe | Entra/sale desde abajo | — | Tipos/lint |
| Stories: anillos, «+», controles del visor | Estáticos | `PressableScale` | none | Tipos/lint |
| Selector (`Select`), cierre de hoja de reglas, galería de fotos | Estáticos | `PressableScale` | none | Tipos/lint |
| Ojo de contraseña | Cambio instantáneo | Fundido entre iconos | none | Tipos/lint |
| Interruptor de notificaciones | Sólo animación nativa | + toque de selección | selection | Tipos/lint |
| Inicio: tarjetas tras la carga | De golpe | `Reveal` | — | Tipos/lint |

## Tour guiado

Rediseñado entero (ver el diagnóstico en el plan de la sesión). Reglas probadas con `node --test`
(`yarn workspace @gymsheet/mobile test:tour`, 18 casos): cuándo se abre un tour, dónde cae la tarjeta, cuánto
se desplaza la lista.

| Elemento | Valor |
|---|---|
| Anillo | Se desplaza entre pasos con `SETTLE_SPRING`; aparece donde va, sin viajar desde (0, 0) |
| Tarjeta | Pegada al hueco, con flecha; entrada de escala 0,9 → 1 + fade, 280 ms |
| Puntos | El activo se ensancha (6 → 18 px, 140 ms) |
| Tocar el hueco | Avanza (cierra en el último paso) |
| Tocar fuera / «Saltar» / atrás de Android | Cierra |
| Reducido | Todo sin viaje: el hueco cambia de sitio y la tarjeta aparece directa |

### Comprobado en el simulador (iPhone 17 Pro, iOS 26.5, Expo Go SDK 57, 2026-10-02)

- La bienvenida señala los iconos reales de la barra (Inicio, Rutinas) con flecha y anillo.
- Tras la bienvenida, el tour de Inicio **sí se abre** (antes se perdía) y el anillo rodea «Tu evolución» y
  después «Músculos de esta semana», con la lista desplazada sola hasta traerlos a la vista.
- El tour de Rutinas se abre sólo al entrar en esa pestaña, salta solo el paso cuyo elemento no existe (la
  semana, sin rutinas asignadas) y termina en «Crear rutina».
- Tocar el elemento resaltado cierra el tour y **no** ejecuta el botón.

## No ejecutado

- **Android** (emulador o dispositivo): ningún flujo. El tour trae `navigationBarTranslucent`, el tamaño
  del escenario medido en el propio Modal y `supportedOrientations`, pero eso no se ha visto en Android.
- **Giro del teléfono** con el tour abierto.
- **Perfilado** (F07.4) de cualquiera de los cambios de motion.
- **Comprobación visual** de los controles de la tabla (`Evidencia: Tipos/lint`): compilan y el bundle de
  iOS arranca sin errores, pero no se miraron en pantalla uno a uno (el visor del host dejó de responder
  durante esa pasada).
- **Háptico** de pestañas, segmentados y casilla: un simulador no vibra.
- «Reducir movimiento» activado a mitad de sesión.
