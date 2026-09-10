# ADR-0003: Dirección visual «Apple premium, ultralimpia»

- Status: accepted
- Date: 2026-09-10
- Relacionado: ADR-0002 (sistema de tokens dual dark/light)

## Contexto

La identidad actual («volt»: verde `#c3f400` sobre negro puro) es reconocible pero
**ruidosa**: el acento se usa como relleno, borde, glow, degradado y sombra a la vez;
la elevación se apoya en `pageGlow`/`sheen`/`aurora` decorativos; el espaciado es
compacto; y el movimiento vive como números mágicos dispersos por CSS y Tailwind. Los
comentarios del propio CSS ya venían bajando pesos y apretados de la tipografía de
display, señal de que el equipo quiere una lectura más calmada.

El encargo es llevar todo el producto (web y móvil) a una única dirección: **calma,
deliberación, generosidad espacial, precisión técnica, silencio visual hasta que hay
que actuar**, coherente en claro y oscuro — sin clonar assets ni trade dress de Apple.

Skills que dirigen la ejecución: `apple-premium-ui` (dirección de arte y gate final),
`frontend-design`, `ui-ux-pro-max`, `design-system`, `ui-styling`, `motion-design`,
`motion-framer`, `gsap-*`, `react-view-transitions`, `react-best-practices`,
`web-design-guidelines`.

## Decisión

### 1. El acento: se conserva el tono, se restringe el uso

`--volt` sigue siendo `#c3f400` y el **único** acento intencional. No se desatura: un
lima distinto no es «más Apple», solo es otro lima. La apple-ness viene del despliegue,
no del matiz. Reglas de uso (obligatorias a partir de Fase 3):

- El acento marca **una** acción dominante por región y, como mucho, **un** dato clave.
- Prohibido como color de superficie, de borde por defecto, de glow ambiental o de
  sombra. `pageGlow`, `sheen`, `aurora*` pasan a ser opt-in de páginas públicas, no
  cromo de producto.
- Los neutrales profundos y los bordes de 1px de bajo contraste hacen la jerarquía.

### 2. Superficies por luminancia, no por efecto

Profundidad en cuatro niveles: lienzo base → superficie elevada → overlay temporal →
estado de foco/interacción. Separación por luminancia + borde 1px + sombra restringida.
Blur solo donde el compositing tiene sentido (headers, overlays): nuevos tokens
`--surface-glass` / `--blur-*`.

### 3. Espaciado generoso y regular

Escala de ritmo: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`. Ritmo vertical de pantalla
y de card explícito. La generosidad se aplica en el uso (Fases 5–6), la escala compartida
de `@gymsheet/design-tokens` solo gana los escalones que faltan.

### 4. Tipografía deliberada

Stack de sistema (`system-ui, -apple-system, …`) disponible como tipografía de tenant
«nativa». Escala con tracking / line-height / peso calibrados **por tamaño**; nunca peso
solo para jerarquía. Se terminan de bajar los pesos de `.display-title`, `.data-label`,
`.data-value`.

### 5. Movimiento con propósito y tokenizado

El movimiento comunica estado y causalidad, no decora. Prioridades: continuidad →
manipulación directa → respuesta → relación espacial → deleite (solo al final).

- **Tokens de movimiento** (`--dur-1..6`, `--ease-out/in/in-out`) en `globals.css` junto
  a los radios — son ritmo, no identidad de marca — y publicados en
  `@gymsheet/design-tokens` (`durations`, `easings`) como línea base de la web. El móvil
  conserva su propia paleta afinada con háptica (`motion.tsx`): el movimiento responde
  al medio igual que la rampa de superficies.
- **CSS** para entradas simples · **Framer Motion** para estado de componente,
  `AnimatePresence` y layout · **GSAP ScrollTrigger** solo para narrativa scroll de
  páginas públicas.
- Transición de ruta: se conserva el remonte de `<main key={pathname}>` con
  `.page-enter` (ahora solo `transform`/`opacity`, sin `filter: blur`). La **View
  Transitions API** de React (experimental, requiere flag y cablear
  `addTransitionType` en cada navegación) queda **aplazada** hasta poder validarla
  en navegador — no se añade a ciegas.
- `prefers-reduced-motion` ya tiene kill-switch global en `animations.css`; toda pieza
  nueva debe seguir funcionando con él activo. Limpieza de efectos en unmount, obligatoria.

### 6. Estados completos

Cada elemento interactivo: default · hover (cuando aplica) · active/pressed ·
focus-visible · disabled · loading · error/success. Target táctil ≥44px.

### 7. Responsive = recomposición

No encoger el desktop: recomponer navegación, escala de tipo, densidad, colocación de
acciones, media y amplitud de movimiento.

## Consecuencias

- Los tests de tema que fijan la identidad actual (`--volt: #c3f400`,
  `--accent-channels: 195 244 0`) **se mantienen**: no se toca el hex.
- `default-palette.ts` baja las opacidades de `aurora*`/`pageGlow` y `noiseOpacity`;
  ningún test los fija, no hay ruptura de contrato.
- `AmbientBackground` ya se atenúa por contexto y respeta `prefers-reduced-motion` y
  `pointer: coarse` — se conserva, solo se calma su paleta.
- El trabajo por pantalla (Fase 6) es iterativo, 1 PR por área, con gate de
  `web-design-guidelines` + `react-best-practices` antes de cerrar.
- El plan completo de fases vive en la conversación de arranque; este ADR fija la
  dirección y las reglas que no se renegocian pantalla a pantalla.
