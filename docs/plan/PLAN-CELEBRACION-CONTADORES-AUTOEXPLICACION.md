# Plan: celebración tipo carta, contadores de puntos y app autoexplicativa

Fecha: 2026-09-15. Alcance: `apps/mobile`, `apps/web`, `packages/domain`, y un cambio
pequeño de contrato en `GymSheetBackend` (módulos `workouts` y `progression`).

## 0. Diagnóstico (lo que hay hoy)

| Tema | Móvil | Web |
|---|---|---|
| Celebración de insignia / rango | `src/components/celebration.tsx` (940 líneas). Un **disco** con icono, haz cenital, halo, 2–3 botes, zoom a cámara y texto. Solo se abre al tocar. | `features/progression/components/progression-celebration*.tsx`. Mismo guion, en un `Dialog` de 28 rem. |
| Contador de puntos | `CountUpText` (`components/motion.tsx`) solo en `RankHero` de Trayectoria con `contarPuntos`. Inicio, Perfil, Comunidad y clasificación pintan el número fijo. Implementado con `setState` por frame. | `CountUp` (`shared/components/motion/count-up.tsx`) solo en `RankHero`. `SendaCard` del panel, perfil, clasificación y diálogo de socio pintan el número fijo. |
| Puntos al terminar un entreno | `PATCH /workouts/:id/finish` no devuelve nada de progresión. Solo un toast «Sesión finalizada.» | Igual. |
| Explicación de la senda | Tours para `home, routines, exercises, workouts, profile`. **No hay tour de Trayectoria** ni de Comunidad, Descubrir, Interacciones, Chat, Membresía. | Tutoriales para intro, navegación, entrenos, ejercicios, perfil, membresía, admin. **Ninguno para /trayectoria** ni para la tarjeta de senda del panel. |
| Reglas de puntos | Viven solo en `progression.service.ts` del backend (`POINTS`: 50 por sesión, 2 por serie, 1 por cada 100 kg, 10 por día de la racha más larga, más las insignias). Ningún cliente las muestra. | Igual. |

Por qué la celebración actual «no se siente como un premio»: el objeto es un círculo plano
que sube y baja. No hay **objeto físico** (una carta con dos caras), no hay **tensión** antes
de revelar, no hay **reventón** (flash, sacudida, partículas), no hay **rareza visible** en el
marco, y el texto llega tarde y en pequeño. Clash Royale hace exactamente esas cinco cosas.

## 1. Celebración: la carta

### 1.1 El objeto

Una **carta vertical** (proporción 5:7, ~220×308 pt en móvil, 260×364 px en web) con dos caras:

- **Dorso**: marca GymSheet, patrón sutil, borde del color de rareza. Es lo que se ve primero.
- **Frente**: marco de rareza, icono de la insignia a gran tamaño (SVG/Ionicons, vectorial),
  banda inferior con nombre, etiqueta de rareza y `+{pointsReward} pts`. Para un rango: icono
  del nivel, «Nuevo rango» y el `tagline`.

Escala de rareza (un solo parámetro, como hoy en `INTENSITY` / `RARITY_TIERS`):

| Rareza | Marco | Rayos | Sacudida | Partículas | Brillo holográfico | Háptica |
|---|---|---|---|---|---|---|
| COMÚN | gris plata | no | no | 0 | no | Light |
| RARA | azul | suaves | no | 12 | no | Light |
| ÉPICA | morado | medios, giran | leve (±3 px) | 24 | sí, lento | Medium |
| LEGENDARIA | dorado + arcoíris | intensos, giran | fuerte (±6 px) | 40 | sí, con arcoíris | Heavy + Success |

Subida de rango usa la fila LEGENDARIA y el rótulo «¡NUEVO RANGO!».

### 1.2 El guion (LEGENDARIA, ~3,4 s)

| t (s) | Paso | Qué pasa |
|---|---|---|
| 0,00 | Escena | Fondo casi negro con viñeta radial. |
| 0,00–0,50 | Entrada | La carta entra **de dorso** desde abajo con spring, aterriza con un micro rebote. |
| 0,50–1,40 | Tensión | Tiembla con amplitud creciente, el halo late, los rayos (sunburst cónico) aparecen detrás y giran despacio. Tics hápticos cada 180 ms, acelerando. |
| 1,40–1,55 | Reventón | Flash blanco radial, sacudida de pantalla ±6 px 200 ms, 40 partículas del color de rareza salen en radial. Háptica Heavy. |
| 1,50–2,00 | Volteo | `rotateY` 0→180° con perspectiva 1000, escala 1→1,12→1. El frente aparece a mitad de giro. Barrido holográfico diagonal cruza la carta. |
| 2,00–2,40 | Sello | «¡NUEVA!» entra con escala 1,6→1 y sobreimpulso. |
| 2,40–2,80 | Texto | Rareza, nombre y `+pts` (contando desde 0) escalonados a 90 ms. |
| Reposo | Vida | Rayos siguen girando, brillo holográfico en bucle lento, la carta se inclina con el puntero (web) o con el giroscopio (móvil, opcional). |

Interacción: tocar la carta la vuelve a voltear; «Volver a verla» rebobina el guion;
«Seguir» cierra. Con **movimiento reducido**: la carta aparece ya de frente, sin rayos ni
partículas ni sacudida, y el texto entra sin retardo.

### 1.3 Cuándo se dispara

Hoy solo al tocar. Para que se sienta como un premio real, la carta debe aparecer **cuando
se consigue**:

1. **Al terminar un entreno** (móvil `workouts/[id].tsx`, web `live-workout.tsx`): si la
   respuesta trae insignias nuevas o subida de rango, se abre la cola de cartas ahí mismo,
   una tras otra, como abrir un cofre. Ver §3 para el contrato.
2. **Al entrar a Trayectoria** con `unlockedNow.length > 0`: se abre la cola automáticamente
   una sola vez y luego se llama a `acknowledge` (ya existe).
3. **Al tocar una insignia conseguida o el rango**: revisita, mismo guion. Se mantiene.

El comentario «nunca se dispara sola» del código actual se reemplaza: se dispara sola
**solo para lo nuevo** y una vez; las revisitas siguen siendo bajo demanda.

### 1.4 Arquitectura y archivos

**Guion compartido** (para que móvil y web no diverjan):

- `packages/domain/src/celebration/script.ts`: cue sheet en ms, escala de rareza, número de
  partículas, amplitud de sacudida. Datos puros, sin React. Tests unitarios del guion
  (`bounce/shake timeline` como los actuales `bounceTimeline`).

**Móvil** (Reanimated 3, `expo-linear-gradient`, `expo-haptics`; sin dependencias nativas nuevas):

- `src/components/celebration/` reemplaza a `celebration.tsx`:
  - `card.tsx`: dos caras con `backfaceVisibility: 'hidden'` y `rotateY`; marco por rareza con `LinearGradient`.
  - `rays.tsx`: 8–12 lamas rotadas (el patrón de `BEAM_SLATS` actual) dentro de un `Animated.View` que gira con `withRepeat`.
  - `particles.tsx`: N `Animated.View` con vector radial aleatorio, escala y opacidad; N ≤ 40 y sin re-render de JS por frame.
  - `holo-sheen.tsx`: `Animated.createAnimatedComponent(LinearGradient)` con `useAnimatedProps` sobre `start/end`.
  - `stage.tsx`: orquesta el guion con `withDelay/withSequence/withSpring`; sacudida en el contenedor raíz.
  - `modal.tsx`: `CelebrationModal` con **cola** de sujetos (`subjects: CelebrationSubject[]`).
  - `level-up-watch.ts`: `useLevelUpCelebration` tal cual (SecureStore).
- Si el holográfico con gradientes no da el nivel, **segunda fase opcional**: `@shopify/react-native-skia` para shader de foil. Se decide viendo el resultado en dispositivo, no antes.

**Web** (framer-motion 13 + CSS; sin dependencias nuevas):

- `features/progression/components/celebration/`:
  - `celebration-card.tsx` (`transform-style: preserve-3d`, `backface-visibility: hidden`).
  - `celebration-rays.tsx` (`conic-gradient` repetido + `mask-image` radial, `@keyframes` giro).
  - `celebration-particles.tsx` (spans absolutos con `--angle` y `--distance` por CSS var).
  - `celebration-stage.tsx`, y `progression-celebration.tsx` pasa a un `Dialog` **a pantalla completa** con scrim al 94 %, no de 28 rem.
  - Keyframes nuevos en `animations.css` respetando el kill‑switch de `prefers-reduced-motion`.
  - Inclinación con puntero: `useMotionValue` + `useTransform` sobre `rotateX/rotateY` (±8°).

Skills obligatorias del repo para esta fase: `apple-premium-ui`, `motion-design`,
`motion-framer` (web), `ui-ux-pro-max`, cierre con `web-design-guidelines`.

### 1.5 Criterios de aceptación

- 60 fps en iPhone 11 y en un Android medio (Reanimated en el hilo UI; cero `setState` durante el guion).
- Se lee la rareza sin leer texto (marco + rayos + intensidad).
- La carta se ve **nítida** al voltear y al escalar (todo vectorial).
- Movimiento reducido: la celebración sigue existiendo y se lee entera.
- VoiceOver/NVDA anuncian «¡Insignia conseguida! Nombre. Rareza. +N puntos.» una sola vez.

## 2. Contadores de puntos

### 2.1 Regla

**Todo número de puntos empieza en 0 y sube hasta su valor** cada vez que entra en pantalla.
Duración proporcional al tamaño: 600 ms hasta 100, 1 000 ms hasta 1 000, 1 400 ms hasta
10 000, 1 800 ms por encima. Easing cúbico de salida. Dígitos tabulares para que no baile
el ancho. Con movimiento reducido salta al valor.

### 2.2 Cambios técnicos

- **Móvil**: reescribir `CountUpText` sobre Reanimated: `useSharedValue` + `useAnimatedProps`
  en un `TextInput` no editable (patrón `ReText`). Hoy hace hasta 60 `setState` por segundo y
  re-renderiza la tarjeta entera. Nueva prop `from` (por defecto 0) para animar de un valor
  anterior al nuevo cuando cambia. Un tic háptico `selection` al llegar (opcional, solo en
  Trayectoria).
- **Web**: `CountUp` sobre `useMotionValue` + `animate` de framer-motion, con
  `whileInView` para que los contadores bajo el pliegue cuenten cuando se ven, y re‑cuenta
  cuando cambia `value`. Mantener `sr-only` con el valor final.
- **Dónde se aplica** (hoy solo en `RankHero`):
  - Móvil: tarjeta «Tu senda» de Inicio (`home.tsx:240`), `profile.tsx`, `perfil/[userId].tsx`, Comunidad, filas de la clasificación (escalonadas 60 ms), `+pts` de `BadgeTile`, y la carta de celebración.
  - Web: `SendaCard` del panel, `profile-page-client.tsx`, `member-profile-dialog.tsx`, `LeaderboardCard`, `BadgeTile`, y la carta.
- **Barra de avance** (`ProgressTrack`, ambos): que crezca de 0 a `ratio` sincronizada con el contador, misma duración. Hoy aparece llena.

## 3. Resumen al terminar un entreno (une 1 + 2 + 3)

Es el momento donde la app puede enseñar **qué causa qué**. Hoy es un toast.

### 3.1 Contrato (backend, cambio pequeño)

`PATCH /workouts/:id/finish` devuelve, además de la sesión:

```json
"progression": {
  "pointsBefore": 1190,
  "pointsAfter": 1264,
  "breakdown": { "session": 50, "sets": 16, "volume": 8, "streak": 0, "badges": 0 },
  "unlockedNow": [ ...badges ],
  "levelUp": { "from": {...level}, "to": {...level} } | null
}
```

`computePoints` ya existe; se calcula antes y después dentro de `finishSession`. Se añade al
schema en `packages/schemas/src/definitions/workouts.ts` y al `api-client`. Esto sustituye la
cookie/SecureStore de `useLevelUpWatch` por una señal del servidor (lo que el propio código
pide en sus comentarios).

Además, `GET /progression/rules` devuelve las constantes `POINTS` para que la pantalla de
explicación (§4) nunca se desincronice del backend.

### 3.2 Pantalla «Sesión terminada» (móvil y web)

1. Encabezado «Sesión terminada» con duración y series.
2. **`+74 puntos`** contando desde 0, grande, en `--accent-ink`.
3. Desglose en filas que entran escalonadas: «Terminar la sesión +50», «16 series +16», «800 kg +8».
4. Total del rango: cuenta de `pointsBefore` a `pointsAfter` y la barra avanza lo que corresponde.
5. Si hay `unlockedNow` o `levelUp`: botón «Abrir recompensa» que lanza la cola de cartas. Si
   la preferencia de movimiento no está reducida, se abre sola tras 600 ms.
6. «Seguir» vuelve a la lista de entrenos.

Archivos: móvil `app/(app)/workouts/resumen/[id].tsx` + `src/components/session-summary.tsx`;
web `features/workouts/components/session-summary.tsx` en un `Dialog` a pantalla completa.

## 4. Autoexplicación

Principio: **cada número tiene un «por qué» a un toque de distancia, y cada pantalla se
presenta sola la primera vez en ≤3 pasos.**

### 4.1 Trayectoria / senda

- **Icono ⓘ junto a los puntos** → hoja «Cómo se ganan los puntos» con las reglas de
  `GET /progression/rules` y tus cifras al lado: «Sesiones 24 × 50 = 1 200».
- **«Lo que suma»**: cada `MetricCard`/`StatTile` lleva un chip con su tarifa («× 50 pts»,
  «× 2 pts», «1 pt / 100 kg», «× 10 pts»). Así la sección deja de ser una lista de cifras y
  pasa a ser la explicación del número de arriba.
- **Rareza**: la etiqueta de rareza abre un popover de una frase por nivel («Legendaria: la
  consiguen menos del 1 %»). Las secretas: una línea fija «Las secretas se revelan al conseguirlas».
- **Días de descanso**: subtítulo «Los días marcados no rompen tu racha» y, si hay 6 marcados,
  por qué no se puede marcar el séptimo.
- **Clasificación**: subtítulo «Los cinco primeros de tu gimnasio. Tú apareces siempre».
- **Botón «Revive tu ascenso a X»** → «Ver mi carta de rango». «Has subido a X» solo cuando es nuevo.
- **Estado cero**: «Termina tu primer entreno: +50 puntos y tu primera insignia».
- **Tour nuevo** (móvil `TourKey 'trayectoria'`, web tutorial `senda-overview`), 3 pasos con
  anclas reales: rango y puntos → el camino → insignias y rareza.

### 4.2 Resto de la app (móvil)

Pantallas sin tour hoy: Comunidad, Descubrir, Interacciones, Chat, Membresía,
Notificaciones. Añadir un tour de 2–3 pasos a cada una con el mismo motor `tour.tsx`, y un
botón «?» en `ScreenHeader` que reabra el tour de esa pantalla (hoy solo existe «Ver tutorial»
en Perfil, que reinicia todos).

### 4.3 Web

- Tutorial `senda-overview` y paso en `main-navigation` que nombre la senda.
- `SendaCard` del panel con una línea «Puntos por entrenar. Toca para ver cómo suben».
- El Centro de ayuda ya existe; añadir la entrada de la senda y del resumen de sesión.

### 4.4 Auditoría de microcopy

Pasada única con `web-design-guidelines` sobre todos los textos de Trayectoria, Inicio,
resumen de sesión y tours: segunda persona, una idea por frase, nada de jerga («acknowledge»,
«tier», «ratio»).

## 5. Orden de ejecución y estimación

| Fase | Entrega | Días |
|---|---|---|
| 0 | Contrato backend (`finish` con `progression`, `GET /progression/rules`), schemas y api-client, guion compartido en `packages/domain` | 1,5 |
| 1 | Carta de celebración móvil (rareza, guion, cola, háptica, reduced motion) | 3 |
| 2 | Carta de celebración web (misma escala y guion, pantalla completa, inclinación con puntero) | 2 |
| 3 | Contadores: `CountUpText` sobre Reanimated, `CountUp` sobre framer, aplicarlos en todos los puntos listados, barra sincronizada | 1,5 |
| 4 | Resumen «Sesión terminada» móvil y web con desglose y apertura de cartas | 2 |
| 5 | Autoexplicación: hoja de reglas, chips de tarifa, tours nuevos, botón «?», copy | 2,5 |
| 6 | QA: perf en dispositivo, a11y, reduced motion, tests (`progression-parts.test.tsx`, guion, `tutorial-flow.test.tsx`), `yarn turbo run source-check type-check lint test` | 1,5 |

Total: ~14 días de trabajo. Las fases 1 y 2 son paralelizables; la 3 no depende de nada y
puede ir primero si se quiere ver un cambio rápido.

## 6. Decisiones que confirmar antes de empezar

1. **Auto‑apertura** de la carta al terminar un entreno y al entrar a Trayectoria con novedades (§1.3). Recomendado: sí, solo para lo nuevo.
2. **Skia** en móvil solo si el holográfico con gradientes no convence en dispositivo (§1.4). Recomendado: empezar sin Skia.
3. **Sonido**: Clash Royale usa audio. Recomendado: no en v1; háptica sí.

## 7. Estado de ejecución

Decisiones tomadas (recomendadas): la carta se abre sola solo para lo nuevo; sin Skia; sin sonido, con háptica.

### Fase 0 — hecha

- Backend `progression.service.ts`: `computePointsBreakdown`, `snapshot` (sin efectos), `recordSessionReward`, `getRules`; `POINTS` exportado.
- Backend `GET /me/progression/rules`.
- Backend `PATCH /workouts/:id/finish` devuelve la sesión más `progression: SessionReward | null`. Si la senda falla, la sesión se cierra igual.
- `packages/schemas`: `pointsBreakdownSchema`, `sessionRewardSchema`, `pointRulesSchema`, `workoutFinishSchema`.
- `packages/domain/src/celebration.ts`: escala de rareza, guion, temblor, sacudida, partículas, contadores y reglas en palabras.
- Servicios web y móvil: `finish` tipado con recompensa y `rules()`. BFF web permite `/me/progression/rules`.
- `CountUp` (web) y `CountUpText` (móvil) aceptan `from`, `durationMs` y `delayMs`.

### Fases 1–5 — hechas (2026-09-15), sin probar en dispositivo ni navegador

- **Carta móvil**: `apps/mobile/src/components/celebration/` reemplaza a `celebration.tsx`. Cola, apertura automática en Trayectoria, resumen `workouts/resumen.tsx`.
- **Carta web**: `features/progression/components/celebration/`, diálogo a pantalla completa, `useRewardQueue`, `features/workouts/components/session-summary.tsx`.
- **Contadores**: `CountUpText` sobre Reanimated y `CountUp` sobre framer-motion, aplicados en Inicio, Trayectoria, Perfil, perfil ajeno, Comunidad, panel web, clasificación e insignias. Barras animadas.
- **Autoexplicación**: hoja/diálogo de reglas, chips de tarifa, leyenda de rareza, tours móviles nuevos y botón «?», tutorial web `senda-overview`.
- **Integración**: la apertura automática usa `isNew` además de `unlockedNow` en ambas plataformas; los resúmenes confirman las insignias y anotan el rango como visto para no repetir la carta.

### Validación

- Backend: `tsc` limpio, lint limpio en archivos tocados, tests unitarios en verde salvo `stories.repository.integration.spec.ts`, que necesita PostgreSQL real y no se tocó.
- Frontend: `turbo run source-check type-check lint test` en verde (22 tareas, 210 tests), `web build` en verde, `mobile type-check` en verde.
- El lint de móvil no se ejecuta: la configuración raíz ignora `apps/**` desde antes de este trabajo.

### Pendiente

- Probar en iPhone y Android: volteo 3D en Android, rendimiento a 60 fps, háptica.
- Revisión visual en navegador claro/oscuro con backend real.
- Inclinación por giroscopio (opcional) y háptica web: no hechas.
