# Plan — Red social estilo Tinder + Stories estilo Instagram + Interacciones (likes, vistas, nexts)

Fecha: 2026-09-11
Repos: `GymSheetBackend` (NestJS 11 / Sequelize / Postgres 16) · `GymSheetFrontend` (monorepo Yarn + Turborepo: `apps/web` Next.js 16, `apps/mobile` Expo/RN, `packages/*`)
Destino de verificación final: **simulador de iPhone** (iPhone 17 Pro, iOS 26.5, Xcode 26.6).

---

## 0. Estado real hoy (auditado, no supuesto)

### Ya existe y funciona

| Pieza | Dónde | Estado |
|---|---|---|
| Baraja de descubrimiento (deck) | `GET /me/discovery/deck` | OK |
| Swipe LIKE/PASS persistido | `POST /me/discovery/swipes` | OK |
| Deshacer último swipe | `POST /me/discovery/swipes/undo` | OK |
| Match automático al like mutuo | `SocialService.swipe` → `sendConnection` | OK |
| Tabla de descartes | `social.discovery_passes` (viewer_id, target_id) | OK |
| Conexiones (solicitudes) | `social.connections` | OK |
| Stories 24h + vistas | `profile.stories`, `profile.story_views` | OK |
| Registro de vistas de perfil | `profile.profile_views` (append-only) | OK, pero sólo se lee como contador |
| Swipe deck móvil con gesto Reanimated | `apps/mobile/app/(app)/descubrir.tsx` | OK |
| Tira de stories móvil | `apps/mobile/src/components/stories-bar.tsx` | OK |
| Galería multi-foto de perfil | `GET /me/photos` (array) | OK |

### Huecos confirmados (esto es lo que el plan cierra)

**G1 — La tarjeta no es Tinder.**
`DirectoryCardFace` es 4:5 dentro de una columna con márgenes, **una sola foto**, sin edad, sin bio, sin carrusel, sin barras segmentadas, sin ficha ampliable. Tinder es a sangre completa, con carrusel de fotos por toque y ficha expandible.

**G2 — El deck expone una sola foto.**
`gymDirectoryEntrySchema.photoUrl` es un único string. El backend tiene N fotos por usuario en `/me/photos` pero `directory()` sólo proyecta la primera. Sin esto, el carrusel Tinder no tiene qué mostrar.

**G3 — Las stories son de todo el gimnasio, no de mis matches.**
`StoriesRepository.feedForTenant(viewerId, tenantId)` devuelve el tenant entero. El requisito es: **sólo las personas con las que hice match** (conexión `ACCEPTED`), más la propia.

**G4 — El feed de stories no sigue el orden ni los estados de Instagram.**
No hay orden "sin ver primero", ni anillo degradado vs anillo gris, ni lista de espectadores de la propia story.

**G5 — No se puede ver quién me dio like.**
Existe el dato (`connections` con `addressee_id = yo`, `status = PENDING`) pero no hay endpoint que lo devuelva como fichas de perfil, ni pantalla.

**G6 — No se puede ver quién vio mi perfil.**
`GET /me/profile-views/summary` devuelve **sólo un contador** (`uniqueViewersToday`). No hay lista de personas ni marca de nuevos.

**G7 — No se puede ver quién me dio next.**
El dato existe (`discovery_passes` con `target_id = yo`) pero no hay endpoint ni pantalla. Tampoco hay forma de ver a quién le di next yo.

**G8 — La web está desincronizada del backend.**
`apps/web/.../social-service.ts` no consume ningún endpoint de `/me/discovery`. El "pasar" de la web es estado local de sesión: **no se guarda**. La web tampoco tiene stories.

---

## 1. Requisitos y criterios de aceptación (esto es lo que se evalúa uno por uno)

Cada requisito tiene un **ID**, un **criterio de aceptación verificable** y un **revisor asignado**. Nada se da por terminado sin que su revisor lo confirme con evidencia ejecutada.

### R1 — Tarjeta y baraja idénticas en lenguaje a Tinder
- R1.1 Tarjeta a sangre completa, ocupa el alto disponible entre cabecera y fila de acciones, esquinas redondeadas, sombra.
- R1.2 Carrusel de fotos: toque en el tercio izquierdo retrocede, en el derecho avanza; **barras segmentadas** arriba, una por foto, la activa llena.
- R1.3 Cabecera de datos: `Nombre, edad` en tipografía grande, y debajo objetivo / sucursal / nivel; chevron que abre la ficha ampliada.
- R1.4 Ficha ampliada (sheet): todas las fotos en vertical, bio, objetivo, experiencia, insignias, botón de reportar/bloquear si existe.
- R1.5 Sellos rotados `ME INTERESA` (izquierda, verde/volt) y `PASO` (derecha, rojo) que ganan opacidad con el arrastre — ya existe, se conserva y se ajusta al nuevo layout.
- R1.6 Fila de acciones de 5 botones al estilo Tinder: **Deshacer** (ámbar), **Paso** (rojo), **Super interés** (azul), **Me interesa** (verde/volt), **Impulso** (morado). Los que no tengan backend se implementan con comportamiento real o no se pintan — **no se pintan botones muertos**.
- R1.7 Pila de cartas: se ve la siguiente detrás, escalada y desplazada.
- R1.8 "¡Match!" a pantalla completa con las dos fotos y las dos acciones (mensaje / seguir).
- R1.9 `prefers-reduced-motion` respetado en todo lo anterior.

**Aceptación:** capturas del simulador de iPhone mostrando R1.1–R1.8, y `type-check` + `lint` verdes.

### R2 — Stories sólo de mis matches, con lenguaje Instagram
- R2.1 `GET /me/stories/feed` devuelve **sólo** stories de usuarios con conexión `ACCEPTED` con el viewer, más las propias. Nadie más.
- R2.2 Orden Instagram: primero la propia, después las que tienen contenido **sin ver** (más reciente primero), después las ya vistas (más reciente primero).
- R2.3 Anillo: degradado de marca cuando hay contenido sin ver, anillo gris apagado cuando ya se vio todo. Aro blanco de separación entre foto y anillo.
- R2.4 Visor: barras de progreso segmentadas arriba (una por story), avance automático, toque derecho/izquierdo para saltar, mantener pulsado para pausar, arrastrar hacia abajo para cerrar.
- R2.5 En la propia story: contador y **lista de espectadores** ("Visto por N") con avatar y nombre.
- R2.6 Al terminar las stories de una persona, salta a la siguiente persona del carrete.

**Aceptación:** test de backend que prueba que un no-match no aparece en el feed; capturas del visor y de la lista de espectadores.

### R3 — Quién me dio like
- R3.1 `GET /me/interactions/likes-received` devuelve fichas de perfil completas (misma forma que la tarjeta del deck) de quienes me enviaron like y aún no respondí.
- R3.2 Pantalla dedicada con rejilla de tarjetas, contador en la cabecera y badge en la barra de pestañas.
- R3.3 Desde cada tarjeta se puede **aceptar** (crea match) o **rechazar**, con efecto inmediato.
- R3.4 `GET /me/interactions/likes-sent`: a quién le di like yo y sigue pendiente, con opción de retirar.

### R4 — Quién vio mi perfil
- R4.1 `GET /me/profile-views` devuelve la lista de espectadores únicos con `lastViewedAt` y `viewCount`, paginada, más reciente primero.
- R4.2 El resumen mantiene `uniqueViewersToday` y suma `totalUnique` y `newSinceLastCheck`.
- R4.3 Pantalla dedicada con la lista, marca visual de "nuevo" y navegación al perfil.
- R4.4 La vista de perfil se registra de verdad al abrir `perfil/[userId]` y al abrir la ficha ampliada del deck.

### R5 — Quién me dio next
- R5.1 `GET /me/interactions/passes-received`: quiénes me descartaron, con fecha.
- R5.2 `GET /me/interactions/passes-sent`: a quiénes descarté yo, con fecha, y acción para **devolver a la baraja** (borra el pass).
- R5.3 Pantalla dedicada con las dos pestañas.
- R5.4 Aviso de privacidad honesto en la pantalla: esta información no es recíproca por defecto en apps del sector; se muestra porque el producto lo pide.

### R6 — Paridad web
- R6.1 La web consume `/me/discovery/deck`, `/me/discovery/swipes` y `/undo`. El "pasar" deja de ser local.
- R6.2 La web recibe la tira de stories y el visor.
- R6.3 La web recibe las tres pantallas de R3, R4, R5.

### R7 — Verificación real, no declarada
- R7.1 `yarn lint`, `yarn type-check`, `yarn test` verdes en backend.
- R7.2 `yarn turbo run source-check type-check lint test --filter=!@gymsheet/mobile` y `yarn workspace @gymsheet/web build` verdes.
- R7.3 `yarn workspace @gymsheet/mobile type-check` verde.
- R7.4 **La app corriendo en el simulador de iPhone**, con backend + Postgres reales, y capturas de cada pantalla nueva.

---

## 2. Cambios técnicos por capa

### 2.1 Base de datos (una sola migración nueva)

Auditado contra las migraciones existentes: **ya hay** `social.connections`, `social.discovery_passes`, `social.profile_settings`, `profile.profile_views`, `profile.stories`, `profile.story_views`, `profile.photos`. Índices que **ya existen** y sirven tal cual: `ix_connections_addressee(addressee_id, status)`, `ix_profile_views_viewed_user(viewed_user_id, viewed_at)`, `ix_discovery_passes_viewer_recent(viewer_id, created_at DESC)`, `ix_profile_photos_user(user_id, position)`.

Falta sólo esto, en **una** migración `202609110001-social-interactions.ts`:

1. Índice `ix_discovery_passes_target_recent (target_id, created_at DESC)` — sin él, "quién me dio next" hace scan completo.
2. Columna `social.profile_settings.profile_views_checked_at TIMESTAMPTZ NULL` — para `newSinceLastCheck`.

Convención verificada: nombre `AAAAMM` + secuencia de 4 dígitos, exporta una const de tipo `DatabaseMigration` cuyo `id` es el nombre del fichero sin extensión, se construye con `executeSqlStatements`, y **se registra al final del array** `databaseMigrations` en `src/database/migrations/index.ts`.

### 2.1b Nota sobre datos de perfil que NO existen

No hay campo `bio`, ni fecha de nacimiento, ni intereses libres, ni ubicación geográfica del socio. Sí hay **edad** (`public.perfiles_antropometricos.edad`) y **galería de hasta 6 fotos** (`profile.photos`). **Decisión:** la tarjeta Tinder se construye con lo que existe — nombre, edad, fotos múltiples, objetivo, sucursal, género, experiencia, rango, puntos, estado social e insignias. **No se inventa un campo `bio`**: añadirlo arrastraría columna, endpoint, validación, UI de edición y migración de datos, y eso es un producto distinto del que se pidió. Queda anotado como pendiente explícito de producto.

### 2.2 Backend — módulo `social`

- `social.repository.ts`: `directory()` cambia el `LEFT JOIN LATERAL` que hoy trae **una** foto (`ORDER BY position ASC LIMIT 1`) por una agregación que devuelve la **galería completa** (`photos: {id, url}[]`, hasta 6, ordenada por `position`), y suma `edad` desde `public.perfiles_antropometricos`. Se conserva `photoUrl` como la primera foto: hay consumidores vivos en móvil y web que la usan.
- Nuevo `interactions.controller.ts` (dentro de `social`) con:
  - `GET /me/interactions/likes-received`
  - `GET /me/interactions/likes-sent`
  - `GET /me/interactions/passes-received`
  - `GET /me/interactions/passes-sent`
  - `DELETE /me/interactions/passes/:userId` (devolver a la baraja)
- Todas devuelven la **misma forma de ficha** que el deck más los metadatos de la interacción (`interactedAt`, `connectionId` cuando aplica).
- Validación Zod en la entrada, mappers en la salida, nunca modelos ORM crudos.
- Aislamiento por tenant en todas: fuera del tenant → 404, nunca 403.

### 2.3 Backend — módulo `stories`

- `feedForTenant` → `feedForConnections(viewerId, tenantId)`: `INNER JOIN` contra `social.connections` con `status = 'ACCEPTED'` en cualquiera de las dos direcciones, unido a las propias del viewer. Hoy el orden es `ORDER BY s.user_id`, que en la práctica es aleatorio entre personas.
- Orden nuevo en SQL: propias primero, luego las que tienen algo sin ver, luego por story más reciente. El mapper agrupa por autor y ese orden debe sobrevivir a la agrupación.
- Falta cobertura: **no existe ningún test de `feed`**. La unidad de stories entrega tests de feed sí o sí.
- Nuevo `GET /me/stories/:id/viewers` — sólo el autor; 404 si la story no es suya.
- El purgador de 24h (`stories-purge.service`) no cambia.

### 2.4 Backend — módulo `profile-views`

- `GET /me/profile-views` paginado con `limit`/`cursor`, agrupado por espectador.
- `summary` amplía la respuesta con `totalUnique` y `newSinceLastCheck`.
- `POST /me/profile-views/checked` marca leído.

### 2.5 Contratos compartidos (`packages/schemas`)

Se extienden `definitions/social.ts` y `definitions/stories.ts` con: `photos` en la ficha de directorio, `likeReceivedSchema` / `likeSentSchema` / `passSchema`, `profileViewerSchema`, `storyViewerSchema`. **Los tipos se infieren de los schemas; no se duplican en `@gymsheet/types`.**

### 2.6 Móvil (`apps/mobile`) — objetivo principal

- `src/components/directory-card.tsx` → reescritura como tarjeta Tinder con carrusel, barras segmentadas y cabecera de datos.
- `src/components/profile-detail-sheet.tsx` (nuevo) — ficha ampliada.
- `app/(app)/descubrir.tsx` → layout a sangre, fila de 5 acciones, match a pantalla completa.
- `src/components/stories-bar.tsx` → anillo degradado con `expo-linear-gradient`, orden Instagram.
- `src/components/story-viewer.tsx` → barras segmentadas, pausa por pulsación mantenida, cierre por arrastre, salto entre personas, lista de espectadores.
- `app/(app)/interacciones.tsx` (nuevo) — pestañas Likes / Vistas / Nexts.
- Badge de likes pendientes en `(tabs)/_layout.tsx`.

### 2.7 Web (`apps/web`)

- **`shared/server/backend-route-policy.ts` — el allowlist del BFF.** Hoy sólo permite `/me/connections`, `/me/connections/:id`, `/me/social-status`, `/me/gym-directory` y las dos de chat. Sin añadir ahí `/me/discovery/*`, `/me/stories/*`, `/me/profile-views*`, `/me/interactions/*` y `/me/gym-directory/:userId`, el proxy responde 404 "Ruta no permitida" y **ninguna pantalla nueva funciona**. Es el primer cambio de la unidad web, no el último.
- `shared/api/api-client.ts` — no existe camino de subida multipart en web (`apiClient.upload` sólo existe en móvil). Hace falta para publicar stories desde el navegador.
- `features/social/services/social-service.ts` — añadir `discovery.deck/swipe/undo`, `stories.*`, `interactions.*`, `profileViews.*`.
- `features/social/components/directory-swipe-deck.tsx` — pasar a swipes persistidos.
- `features/stories/*` (nuevo) y `features/social/components/interactions-*` (nuevo).

---

## 3. Arquitectura de ejecución — el agente Dios

El agente Dios es el orquestador (esta sesión). Reparte **ejecutores** sobre ficheros disjuntos y, **en cuanto un ejecutor termina, lanza inmediatamente su revisor** sin esperar al resto. Es el patrón `pipeline`: la revisión de la unidad A corre mientras la unidad B todavía se está escribiendo.

```
                        ┌──────────────── AGENTE DIOS (orquestador) ────────────────┐
                        │  posee: contratos compartidos, orden, integración, veredicto │
                        └───────────────────────────┬──────────────────────────────┘
                                                    │
   Ola 0 (secuencial, la hace el Dios: superficie compartida, nadie más la toca)
   ├── packages/schemas/definitions/{social,stories}.ts   (contratos)
   └── backend social.repository.directory()              (fotos, edad, bio)
                                                    │
   Ola 1 (ejecutores en paralelo, ficheros disjuntos)  ──► cada uno dispara SU revisor al terminar
   ├── E1 backend/stories        ──────────────► R-E1  revisor de stories
   ├── E2 backend/profile-views  ──────────────► R-E2  revisor de vistas
   ├── E3 backend/social interactions ─────────► R-E3  revisor de interacciones
   ├── E4 backend/migraciones + índices ───────► R-E4  revisor de datos
   └── E5 mobile/tarjeta Tinder  ──────────────► R-E5  revisor de diseño Tinder
                                                    │
   Ola 2 (dependen de la 1)
   ├── E6 mobile/stories Instagram ────────────► R-E6
   ├── E7 mobile/pantallas de interacciones ───► R-E7
   └── E8 web/paridad ─────────────────────────► R-E8
                                                    │
   Ola 3  Reparación: cada hallazgo confirmado → agente reparador → re-revisión (máx. 3 rondas)
                                                    │
   Ola 4  Verificación integral: lint · type-check · test · build · migraciones · Docker
                                                    │
   Ola 5  SIMULADOR DE IPHONE: backend real + Postgres real + app nativa + capturas
```

### Reglas del orquestador (no negociables)

1. **Propiedad exclusiva de ficheros.** Dos ejecutores nunca escriben el mismo fichero. Los contratos compartidos los escribe sólo el Dios, antes de la Ola 1.
2. **Revisor inmediato.** El revisor de una unidad arranca en cuanto esa unidad termina, no al final.
3. **El revisor no cree, comprueba.** Cada revisor recibe los criterios de aceptación de su requisito y debe citar fichero:línea o salida de comando. Un revisor que no puede citar evidencia devuelve `NO VERIFICADO`, no `OK`.
4. **Revisión adversaria.** El revisor busca activamente: fuga de tenant, autorización en cliente en vez de servidor, N+1, modelos ORM devueltos crudos, `any`, botones sin backend, movimiento sin `reduced-motion`, y **funcionalidad simulada** (datos falsos, `TODO`, listas vacías codificadas).
5. **Máximo 3 rondas de reparación** por unidad. Lo que no pase en 3 rondas se reporta como pendiente explícito, no se esconde.
6. **Ninguna unidad se declara hecha sin evidencia ejecutada.** Regla ya escrita en `CLAUDE.md` del backend, aquí se aplica a cada unidad por separado.
7. **Las skills de diseño del repo son obligatorias** para toda UI: `apple-premium-ui` primero, luego `ui-ux-pro-max` / `motion-design` / `motion-framer`, y `web-design-guidelines` como pasada de cierre. El "parecido a Tinder" es de **estructura e interacción**, no de copiar assets ni trade dress: nada de logo, tipografía propietaria ni degradado exacto de Tinder.

---

## 4. Riesgos y cómo se tratan

| Riesgo | Tratamiento |
|---|---|
| "Quién me dio next" es información sensible y hostil para quien la recibe | Se implementa porque es requisito explícito. Se añade aviso claro en pantalla y se deja el interruptor de visibilidad en manos del producto. |
| Copiar trade dress de Tinder/Instagram | Se replica **patrón de interacción y jerarquía**, no marca. Paleta y tipografía siguen siendo las del repo (`design-tokens`). |
| Conflictos de escritura entre agentes | Propiedad exclusiva de ficheros y contratos escritos antes de repartir. |
| Postgres no disponible | Docker Desktop arrancado al inicio; `postgresql@16` de Homebrew como respaldo en el puerto 5433. |
| Deriva entre web y móvil | Los contratos viven en `packages/schemas` y ambos los consumen; ningún schema se duplica. |
| Sesión larga durante la noche | El orquestador no pregunta: decide con el criterio de este documento y deja registro de cada decisión en el informe final. |

---

## 5. Entregable final

1. Código en ambos repos, en ramas de trabajo, sin `push` (acción irreversible: requiere permiso).
2. Informe `docs/plan/INFORME-EJECUCION.md` con: requisito → veredicto del revisor → evidencia citada.
3. Capturas del simulador de iPhone en `apps/mobile/ios-evidence/` numeradas y nombradas por pantalla.
4. Lista explícita de lo que quedó pendiente, si algo quedó.
