# Plan — Visuales de REPP: mensajería estilo Tinder, Marketplace estilo Facebook/Amazon, Música estilo Spotify

- **Fecha:** 2026-10-24 · **Repos:** `GymSheetFrontend` (`apps/mobile` primero; `packages/*`; `apps/web` en H7) y `GymSheetBackend` (contratos aditivos) · **Rama:** `claude/brave-pasteur-t5425i` en ambos · **Predecesores:** `docs/plan/PLAN-SOCIAL-TINDER-INSTAGRAM.md` (2026-09-11), `docs/trabajo/2026-10-08-social-recomendaciones/` (chat H7), `PLAN_RUTINAS_REPP` §C5 (rediseño), `docs/refactor-profesional/` (kit y ADR-0002/0003).
- **Resultado observable:** una persona que usa REPP encuentra Mensajes con un badge honesto y una experiencia de match-y-chat al nivel de Tinder (con más: citas, reacciones, voz, desaparecer), compra y descubre en un Marketplace con ficha de producto, perfil de vendedor, filtros, guardados y «Mis compras», y en Música busca, alterna cuadrícula/tabla paginada, abre fichas y ve la playlist recomendada de cada rutina; todo con una sola identidad visual, calma y premium, sin datos inventados.
- **Kill-test del conjunto:** tres comprobaciones, una por área: (1) B envía un mensaje y el badge de A no cambia; (2) tocar «Copiar» en el pago y el portapapeles sigue vacío; (3) escribir «cardio» en Música y la lista no filtra. Cualquiera de las tres en rojo = el trabajo no está hecho, por bonitas que sean las pantallas.
- **Estado de implementación:** TODO (este documento es solo planificación; no se tocó código).

> **Plan escrito: 8 hitos (H0–H7), 30 subtareas, 172 microtareas.** De ellas 160 son del alcance
> pedido (H0–H6) y 12 son paridad web opcional (H7). Cada microtarea tiene CA binario, DoD con
> comando y estado. El avance **solo** se informa como `HECHO / 172`.

## Lectura y entregables

| Documento | Qué contiene |
|---|---|
| [fases/H0-H1-preflight-y-cimientos.md](fases/H0-H1-preflight-y-cimientos.md) | Baseline visual de **toda** la app + tokens, guardas y primitivas compartidas (el «toda la app») |
| [fases/H2-mensajeria.md](fases/H2-mensajeria.md) | Mensajes y chat estilo Tinder mejorado |
| [fases/H3-marketplace.md](fases/H3-marketplace.md) | Marketplace estilo Facebook Marketplace / Amazon |
| [fases/H4-H5-musica.md](fases/H4-H5-musica.md) | Música estilo Spotify (buscador, grid, tabla paginada, ficha) y playlist recomendada por rutina |
| [fases/H6-H7-cierre-y-paridad-web.md](fases/H6-H7-cierre-y-paridad-web.md) | Regresión, gates, reporte, PR; paridad web opcional |
| [evidencia/auditoria-mensajeria.md](evidencia/auditoria-mensajeria.md) · [auditoria-marketplace.md](evidencia/auditoria-marketplace.md) · [auditoria-musica.md](evidencia/auditoria-musica.md) | Descubrimiento factual (fase 1) con rutas y líneas; es lo que justifica cada microtarea |
| `REPORTE.md` | Se escribe al cerrar cada sesión de ejecución (regla 40). Hoy no existe porque no hubo ejecución |

## Qué se encontró (resumen del descubrimiento)

La app es **móvil primero** para estas tres áreas: la música no existe en la web y el marketplace
web es un listado SSR. En el móvil:

- **Mensajería** está técnicamente sólida (socket con ticket, media cifrada, recibos configurables,
  edición/borrado idempotentes, 14 archivos de tests) pero **mal presentada**: no hay entrada ni
  badge de no leídos, hay dos listas duplicadas, la fila no distingue leído de no leído, la
  cabecera es WhatsApp, el hilo vacío no dice con quién ni desde cuándo, no hay GIF ni stickers
  (aunque el backend ya tiene stickers), el avatar está reimplementado cinco veces.
- **Marketplace** es un archivo de **2763 líneas** con 22 estados, 4 modales anidados, filtros por
  subcadena (`'protein'`), categorías hardcodeadas, rating `'5.0'` inventado, imágenes de Unsplash,
  botones «Copiar» que no copian, comprobantes que se envían como `file://` si falla la subida,
  sin ficha de producto ni perfil de vendedor como rutas, sin «Mis compras», sin favoritos, unas 150
  infracciones de la guía de diseño que `check-theme` no detecta (fuentes de 10 pt, pesos y números
  sueltos; `check-theme` mide 0) y un solo `accessibilityLabel`.
- **Música** es una cuadrícula de dos pestañas sin buscador, orden, tabla ni ficha; el backend no
  tiene `q`, `tipo`, `sort`, `total` ni `GET /:id`; **ninguna capa** relaciona rutina y playlist.

Detalle, con `archivo:línea`, en `evidencia/auditoria-*.md`.

## Alcance

**IN**
- `apps/mobile`: Mensajes/chat, Marketplace (4 pantallas nuevas + compra + Mis compras), Música
  (lista, buscador, tabla, ficha, selector) y la sección «Música para esta rutina» en la ficha de
  rutina y el asistente; pasada de cimientos visuales (H1) sobre `ScreenHeader`, `Card`, barra de
  pestañas, rampa tipográfica, tokens y primitivas compartidas.
- `packages/schemas`, `packages/types`, `packages/api-client`, `packages/hooks`, `packages/domain`:
  solo campos **aditivos** y opcionales.
- `GymSheetBackend`: contratos aditivos y compatibles con la app publicada — chat (`unreadCount`,
  `matchedAt`, `lastMessageFromMe`, `lastMessageType`, `unread-count`, eventos
  `conversation:updated` y `match:new`), música (`q`, `tipo`, `sort`, `scope=all`, `page/pageSize/
  total`, `GET /:id`, índice trigram), rutinas (`recommended_playlist_id` + regla de visibilidad +
  copia), directorio (`search/sort/price/cursor` en `/plans`, cursor en `/entities`, contrato real de
  pedidos documentado). Tres migraciones nuevas, todas reversibles.
- Tests: vitest de pantalla (shim `rn-dom` ya existente), tests de dominio/paquetes, e2e backend,
  tres flujos Maestro nuevos (16 música, 17 mensajes, 18 marketplace) + baseline 00.
- Evidencia: capturas 375/430 por estado, mutaciones `UI → request → persistencia → recarga → UI`,
  doble revisión visual, checklists de accesibilidad, salidas literales de gates.

**OUT** (se anota, no se hace)
- GIF (Giphy/Tenor): requiere proveedor, clave y proxy → `DECISION_REQUIRED` (A-C3).
- Reproducir música dentro de la app, Web API de Spotify, otros proveedores de música.
- Taxonomía de producto, variantes, stock, envíos, promociones/descuentos, reseñas por producto,
  pasarela de pago online, carrito, chat comprador↔vendedor, gestión de anuncios del dueño,
  favoritos/recién vistos sincronizados en servidor, geobúsqueda.
- Unificar los tres flujos de compra (pedido de marketplace, renovación del gimnasio, «ya pagué»).
- Quinta pestaña «Mensajes» en la barra (A-C1), silenciar en servidor (A-C2).
- Rediseño de pantallas fuera de las tres áreas más allá de lo BLOQUEANTE del inventario de H0
  (Camino/arenas, Entrenar, Reels, Stories, Perfil, Ajustes conservan su diseño; solo heredan H1).
- Paridad web (H7) salvo pedido explícito.
- Publicación en tiendas, merge a `dev` (el flujo termina en abrir el PR).

## Ambigüedades registradas (a confirmar con Pablo antes de la microtarea que las toca)

| ID | Pregunta | Supuesto tomado | Afecta |
|---|---|---|---|
| A-C1 | ¿Mensajes como quinta pestaña o icono con badge en la cabecera? | Icono con badge en las 4 cabeceras + entrada en Perfil (la barra tiene 4 y no se pidió cambiarla) | H2.S3.M8 |
| A-C2 | ¿«Silenciar» debe sincronizar entre dispositivos (servidor)? | Local al teléfono, con copy honesto | H2.S1.M5, H2.S5.M4 |
| A-C3 | ¿Se contrata Giphy/Tenor para GIF? | No se pinta el botón hasta decidir | H2.S4.M7 |
| A-K1 | ¿«Marketplace» o «Directorio»? | «Marketplace» en todas las entradas | H3.S4.M3 |
| A-K2 | ¿Una `MEMBERSHIP_PLAN` del propio gimnasio debe ir por la renovación (`membership.tsx`) o por el pedido de marketplace? | Se mantienen separados; la ficha del plan del propio gimnasio enlaza a «Renovar» | H3.S5 |
| A-M1 | ¿Tabla «paginada» = páginas numeradas o scroll infinito? | Numeradas (`page/pageSize/total`), manteniendo cursor para la cuadrícula | H4.S1.M4, H4.S3.M6 |
| A-M2 | «Cada rutina se pueda recomendar a una playlist»: ¿rutina → 1 playlist, o una playlist → muchas rutinas? | Rutina tiene **una** playlist recomendada (nullable); una playlist puede ser recomendada por muchas rutinas, y su ficha las lista | H5 |
| A-H1 | Los tres datos falsos de la baraja de Comunidad (verificado siempre visible, «Super Like» sin acción propia, objetivo inventado): ¿cuentan como «resto de la app» (H1) o como mensajería (H2)? | H1.S3.M7 (resto de la app); son defectos de honestidad, no de estilo | H1.S3.M7 |
| A-W1 | ¿La paridad web entra en este trabajo? | No; H7 queda planificado y en TODO | H7 |

## Mapa de skills (qué se carga y cuándo)

| Momento | Skills |
|---|---|
| Siempre antes de tocar UI móvil | `repp-diseno` (tokens, primitivas, hápticos, anti-slop, checklist), `apple-premium-ui` (dirección: calma, una acción dominante, profundidad escasa), `ui-ux-pro-max` / `ui-styling` (componentes, estados), `frontend-ux-states` |
| Movimiento | `motion-design`, `animate`, `improve-animations`, `fixing-motion-performance` (burbuja de typing, carriles, celebración de match, galería) |
| Listas, tablas, búsqueda | `frontend-data-tables`, `search-and-filtering`, `frontend-responsive-layout` |
| Accesibilidad | `frontend-accessibility`, `accessibility-testing`, `fixing-accessibility` (WCAG 2.2 AA en lo tocado) |
| Marketing (coreyhaines31/marketingskills, ya en `.claude/skills/`) | `paywalls` + `pricing` → jerarquía de la tarjeta de plan y de la ficha (precio ancla, beneficio principal, un CTA); `cro` → ficha de producto y perfil de vendedor (CTA sobre el pliegue, prueba social real, cero urgencia inventada); `copywriting` + `copy-editing` → todo el microcopy nuevo (de tú, verbo primero, sin AI-tells, sin «¡!» en cadena); `onboarding` → vacíos que orientan (Mensajes sin matches, Guardados, Mis compras, Música sin playlists); `marketing-psychology` → solo principios con dato real detrás (prueba social con rating existente; **nunca** escasez o contadores sin dato); `churn-prevention` → copy de «Desemparejar/Bloquear» y del estado `REJECTED` del pedido (claro, sin culpar); `social` / `community-marketing` → rompehielos y copy del carril de matches; `product-marketing` → `.agents/product-marketing.md` con la voz de REPP una sola vez para que las demás lo lean |
| Verificación | `visual-proof`, `visual-testing`, `critical-double-review`, `evidence-and-verification`, `e2e-playwright` (web), `web-design-guidelines` (auditoría final de cada pantalla nueva) |
| Datos y backend | `model-driven-schema` (migraciones), `nestjs-development`, `api-openapi-docs`, `authz-access-control`, `security-guardrails` |
| Proceso | `milestone-planning`, `scope-discipline`, `rationalization-guard`, `work-report-md`, `pr-mergeable-gate`, `github-pull-requests` |

Las skills de marketing **no** sustituyen a las de diseño ni a `repp-diseno`: el copy dentro de la
app sigue la voz de REPP (`CLAUDE.md`).

## Hitos y orden de dependencias

| Hito | Resultado observable | Depende de | Micro-tareas | Plan |
|---|---|---|---|---|
| H0 | Baseline de toda la app capturado, gates medidos, entorno y datos sintéticos listos | — | 8 | [Abrir](fases/H0-H1-preflight-y-cimientos.md) |
| H1 | Cimientos visuales compartidos: rampa, tokens, guardas, primitivas únicas, pasada «calma» | H0 | 23 | [Abrir](fases/H0-H1-preflight-y-cimientos.md) |
| H2 | Mensajes y chat estilo Tinder mejorado, con badge, matches, hilo vacío, estados y moderación | H1 (+ backend H2.S1) | 41 | [Abrir](fases/H2-mensajeria.md) |
| H3 | Marketplace con buscador, filtros, ficha de producto, vendedor, compra honesta, guardados y Mis compras | H1 (+ backend H3.S1) | 39 | [Abrir](fases/H3-marketplace.md) |
| H4 | Música con buscador, chips, carriles, cuadrícula, tabla paginada y ficha | H1 (+ backend H4.S1) | 30 | [Abrir](fases/H4-H5-musica.md) |
| H5 | Playlist recomendada por rutina (ficha, asistente, catálogo, entrenamiento activo) | H4 | 19 | [Abrir](fases/H4-H5-musica.md) |
| H6 | Regresión, gates, revisores independientes, `REPORTE.md`, PRs mergeables | H2–H5 | 7 | [Abrir](fases/H6-H7-cierre-y-paridad-web.md) |
| H7 | Paridad web (opcional) | H6 | 5 | [Abrir](fases/H6-H7-cierre-y-paridad-web.md) |

```
H0 ─► H1 ─┬─► H2 (chat)        ─┐
          ├─► H3 (marketplace) ─┼─► H6 (cierre) ─► H7 (web, opcional)
          └─► H4 (música) ─► H5 (playlist por rutina) ┘
```

**Orden recomendado de ejecución** (una franja por vez, `NO_BIG_BANG_REWRITE`):
1. H0 completo (medio día).
2. H1.S1 + H1.S2 (los tres hitos grandes los consumen); H1.S3 puede ir en paralelo con H2 si lo
   hace otra persona, en archivos disjuntos.
3. **H2 primero** porque es lo que Pablo marcó «en especial», y su backend (H2.S1) es el más chico.
4. H4 → H5 (música), porque H5 toca el modelo de rutina y conviene cerrarlo antes de la pasada de
   regresión del catálogo.
5. H3 (marketplace), el más grande en frontend y el que borra más código.
6. H6. H7 solo si se pide.

Backend siempre **antes** que su frontend en cada hito, y siempre compatible con la app publicada
(parámetros opcionales, campos aditivos): el orden de despliegue es backend → móvil.

## Cómo se trabaja (reglas que aplican a cada microtarea)

- **Una microtarea `EN CURSO` a la vez**, con checkpoint al abrir y al cerrar (regla 50), estado
  actualizado en el archivo de fase en el momento.
- **`HECHO` solo con el DoD ejecutado y la salida pegada** en `evidencia/`. Código escrito sin DoD
  = `A MEDIAS` con qué anda / qué no / qué falta / dónde quedó.
- **Peldaño de evidencia** (regla 30) declarado por área; lo visual exige captura mirada dos veces
  (`critical-double-review`) y lo que muta exige `UI → request → response → persistencia →
  recarga → UI`. Un toast no prueba nada.
- **Gates del repo:** `yarn workspace @gymsheet/mobile type-check` y `lint` (incluye
  `scripts/check-theme.mjs`, que debe quedar en **0**) tras cada microtarea de UI; `yarn turbo run
  source-check type-check lint test --filter=!@gymsheet/mobile` cuando se toca `packages/*`;
  backend `yarn lint && yarn type-check && yarn test` + e2e dirigido tras cada microtarea de API.
- **Sin inventar:** nada de datos ficticios presentados como reales (`'5.0'`, `'Bolivia'`, Unsplash
  se van), nada de botones sin backend, nada de API de terceros sin verificar en la versión
  instalada (Expo 57, RN 0.86, Reanimated 4.5, gesture-handler 2.32, expo-router 57).
- **Sin debilitar tests:** el único test que cambia de aserción es el del panel de adjuntar («cinco
  items» → «seis items, cada uno cableado»), documentado en H2.S4.M7.
- **Identidad:** REPP de cara a la gente; nada de verde Spotify, llama de Tinder, azul Facebook ni
  naranja Amazon. Se toman patrones de interacción, no trade dress.
- **Privacidad:** capturas y evidencia con cuentas sintéticas de `DATOS_DE_PRUEBA.md`; ningún dato
  real de personas en `evidencia/`.
- **Recursos:** un simulador, un runner de tests y un servidor por puerto a la vez; subagentes solo
  de lectura (auditoría/revisión) salvo revisor independiente al cierre.

## Riesgos y bloqueos previstos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| **Línea base medida (H0.S1.M3, 2026-10-24):** `type-check` móvil falla hoy con 1 error previo en `src/theme/contrast.test.ts:102` (TEST_BUG de tipos, `test:theme` pasa 16/16); el script `lint` no corre en este contenedor por enlaces `.bin` ausentes (ENVIRONMENT; `expo lint` directo y `check-theme` dan 0) | los DoD «type-check verde» no se pueden cumplir sin tocar ese test | se declara como fallo previo fuera de alcance; el criterio de cada microtarea es «sin errores nuevos respecto de la línea base»; arreglar ese test es una microtarea aparte que Pablo debe aprobar |
| **Backend e2e en rojo previo (H0.S1.M2):** `yarn test:e2e` falla 47 tests en 9 de 52 suites con la BD sembrada (`routines-recommended`, `social-map-places`, `community-moderation`, `chat-initial-publication`, `workout-free-and-swap`, `entrenar-juntos`…); ninguna combinación de datos las pasa todas. Hallazgo de producto: el seeder `showcase` inserta `objetivo = RENDIMIENTO_DEPORTIVO` y la restricción `ck_perfiles_objetivo` (`docs/db/schema.sql:73`) no lo admite, aunque el enum de código sí | los e2e de H2/H4/H5 que toquen chat y rutinas conviven con rojos ajenos | el criterio es «ningún fallo nuevo» comparando suite por suite con `gates-backend.md`; el defecto del objetivo se anota para Pablo y no se arregla aquí (fuera de alcance, regla 00 §3) |
| **Segundo fallo previo (H0.S1.M4):** `@gymsheet/web#test` tiene 1 test rojo de 514 (`training-invitations-client.test.tsx`, NBSP de ICU 77.1 en el texto esperado, TEST_BUG de entorno) | `yarn turbo run … test` no puede quedar verde sin arreglarlo | mismo criterio: «sin fallos nuevos respecto de la línea base»; se propone como microtarea aparte (normalizar el esperado, sin debilitar la aserción) |
| `fullstack-dev-skills` no está habilitado en la sesión (`CLAUDE.md` lo exige para tocar código) | bloquea H1 en adelante | H0.S1.M1 lo verifica y lo pide; la planificación no lo necesita |
| Cambiar `ConversationSummary` y `Routine` (contratos consumidos por web y móvil) | romper web | campos opcionales + `regression-auditor` en H6; web tolera ausencia |
| Borrar `directorio.tsx` (2763 l.) | regresión silenciosa | redirect + borrado solo tras Maestro verde en las 4 pantallas nuevas |
| Dos sockets de chat (lista + hilo) | tickets, duplicados | un socket en `providers` con `join` por conversación |
| Volumen: 172 microtareas | sesiones múltiples | el archivo de fase es el estado; `REPORTE.md` por sesión; se puede cerrar cualquier hito por separado |
| Decisiones de negocio abiertas (A-C3, A-K2) | botones muertos o flujos confusos | nada se pinta sin decisión; se implementan las ramas definidas |
| Tablet/apaisado | layouts rotos | `useScreenFrame` en todas las parrillas nuevas; captura en 820 pt para música y marketplace |
| Spotify oEmbed limitado | tabla sin «N canciones» | columnas solo con datos reales |

## Cómo retomar este plan en otra sesión

1. Leer este `PLAN.md` y el archivo de la fase vigente; el estado de cada microtarea está en su tabla.
2. Leer `REPORTE.md` de la última sesión (si existe) y `evidencia/`.
3. Verificar H0.S1.M1 (plugins) antes de escribir UI.
4. Abrir **una** microtarea, ejecutar, pegar evidencia, cerrar, siguiente.
