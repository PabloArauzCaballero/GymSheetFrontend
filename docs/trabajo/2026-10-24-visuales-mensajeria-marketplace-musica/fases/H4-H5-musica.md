# H4 + H5 — Música estilo Spotify y playlist recomendada por rutina

**Resultado observable:** una persona abre Música, escribe en el buscador y ve resultados agrupados
por tipo mientras escribe; alterna entre cuadrícula y tabla paginada; abre una playlist en su ficha
con portada grande; y desde la ficha de una rutina ve (o el dueño elige) la playlist recomendada,
que se abre en Spotify con un toque.

**Referencia de interfaz:** Spotify (barra de búsqueda arriba, chips de tipo, carriles horizontales,
cuadrícula de portadas 2×N, filas compactas portada-título-meta, cabecera de playlist con portada
grande sobre degradado). Lo que **no** se copia: verde `#1DB954`, iconografía propia de Spotify,
tipografía Circular, el reproductor. Aquí no se reproduce nada: la app es un enlace al proveedor
(`music-screen.tsx` cabecera, decisión de Pablo 2026-10-15).

**Kill-test:** escribir «cardio» en el buscador y que la lista no cambie; o que una rutina pública
muestre una playlist privada de otra persona.

## Estado real (auditado 2026-10-24)

| Hecho | Dónde |
|---|---|
| Pantalla única con dos pestañas (Todas / Compartidas), cuadrícula hecha a mano con `.map()` dentro de `ScrollScreen`, botón «Ver más» | `apps/mobile/src/features/music/music-screen.tsx:95-161` |
| Ancho de tarjeta calculado con `gutter` fijo: se rompe en tablet/apaisado | `music-screen.tsx:62` vs `components/layout.tsx:309-333` (`maxContentWidth` 560) |
| Única entrada: menú ⋯ de Rutinas | `features/routine-catalog/routines-catalog-screen.tsx:217-223` |
| Sin buscador, sin orden, sin filtro por tipo, sin vista de lista/tabla, sin ficha de playlist | — |
| API: `GET/POST /music/playlists`, `PATCH/DELETE /music/playlists/:id`. Query: `scope`, `cursor`, `limit ≤ 50`. **Sin `q`, sin `tipo`, sin `sort`, sin `total`, sin `GET /:id`** | `GymSheetBackend/src/modules/music/music.controller.ts:24-53`, `music.schemas.ts` |
| Contrato compartido `MusicPlaylist {id,url,tipo,titulo,imagenUrl,visibilidad,esMia,creadaEn,autor}` | `packages/schemas/src/definitions/music.ts` |
| Rutina sin ninguna relación con música en modelo, esquema, tipos ni borrador del asistente | `GymSheetBackend/src/modules/training/routine.model.ts`, `packages/types/src/training.ts:79-115`, `packages/hooks/src/routine-draft/model.ts:94-107` |
| El patrón de validación cliente (`SPOTIFY_URL_PATTERN`) es más estricto que el servidor (rechaza `/embed/`, `/user/<n>/playlist/`, códigos con `_`/`-`) | `packages/schemas/src/definitions/music.ts:33-34` vs `music/spotify-url.ts` |
| El tipo de denuncia del front no incluye `MUSIC_PLAYLIST` aunque el backend sí | `packages/types/src/community.ts:64` |
| Tests: backend completos (spec + e2e); **móvil: ninguno** | `music.service.spec.ts`, `test/music-playlists.e2e-spec.ts` |
| Primitivas reutilizables: `SearchField` (texto fijo «Buscar rutina…»), `Segmented`/`InteractionsList` (numColumns 1|2, onEndReached), `ListScreen`, `NavRow`, `FilterChip`, `HeroBar`/`HeroParallax`, `DetailSection` | ver §4 del informe de auditoría en `../evidencia/auditoria-musica.md` |

## Decisiones de diseño (D-M*)

- **D-M1 — Paginación de la tabla.** Spotify no numera páginas; el usuario pidió «tabla paginada».
  Se implementa paginación **numerada** (`page`, `pageSize`, `total`) **además** del cursor existente,
  en el mismo endpoint: si llega `page` responde `{items,total,page,pageSize}`; si llega `cursor`
  responde como hoy. La cuadrícula sigue con cursor + scroll infinito; la tabla usa páginas con
  «‹ 1 2 3 ›» y «Página X de Y». Se registra como ambigüedad A-M1 por si se prefería solo scroll.
- **D-M2 — «Todas» en el servidor.** Hoy «Todas» mezcla dos consultas (privadas y luego públicas) y
  el orden de paginación es artificial. Se añade `scope=all` al backend (unión con el mismo orden
  `created_at DESC, id DESC`) para que búsqueda, orden y páginas sean coherentes.
- **D-M3 — Búsqueda.** `q` normalizada con `repp_normalize` (migración `202610130002-exercise-search.ts`)
  sobre `titulo` y nombre de autor; `ILIKE` escapado como en `routine-catalog.repository.ts:147,173`;
  índice trigram en `titulo`. Respuesta **agrupada por tipo** la arma el cliente desde `tipo`
  (Playlists / Álbumes / Canciones / Artistas / Podcasts); el servidor solo filtra y ordena.
- **D-M4 — Color.** Nada de verde Spotify. Portada sobre degradado derivado de `muscleGradients`
  (ya se usa de respaldo) o de un nuevo token `musicHero` en `src/theme/extras.ts`. Acción principal
  («Abrir en Spotify») en `colors.volt`, una por pantalla.
- **D-M5 — Playlist recomendada por rutina.** Relación 1 rutina → 0..1 playlist
  (`training.routines.recommended_playlist_id`, FK nullable `ON DELETE SET NULL`). El dueño la fija;
  quien copia la rutina **hereda** la recomendación si la playlist es pública (si es privada, la copia
  nace sin playlist). Una rutina pública con playlist privada/oculta/bloqueada se sirve con
  `playlistRecomendada: null` (el servidor resuelve visibilidad; el cliente no filtra).
  Ambigüedad A-M2: el pedido dice «cada rutina se pueda recomendar a una playlist»; se interpreta
  como «cada rutina tiene una playlist recomendada». Confirmar con Pablo.
- **D-M6 — Sin otros proveedores.** YouTube/Apple Music/Deezer quedan OUT (parser, CHECK de `tipo`
  y regla de producto son solo Spotify). Se anota como deuda de producto.

## Orden de dependencias

```
H4.S1 (backend: q, tipo, sort, scope=all, page/total, GET /:id)
   └─► H4.S2 (contrato compartido + servicio móvil)
          └─► H4.S3 (pantalla: cabecera con buscador, chips, carriles, grid/tabla)
                 └─► H4.S4 (ficha de playlist)  ─► H4.S5 (gestión, denuncia, tests, evidencia)
H5.S1 (backend: migración + mapper + copia)  ─► H5.S2 (contrato + wizard) ─► H5.S3 (ficha de rutina) ─► H5.S4 (evidencia)
```

---

## H4 — Música con buscador, cuadrícula y tabla paginada

**CA:** Dado el usuario con al menos 25 playlists visibles (propias + comunidad), cuando escribe
«cardio» en el buscador, entonces en < 1 s ve solo las coincidencias agrupadas por tipo; cuando
alterna a «Tabla», entonces ve filas paginadas con «Página 1 de N» y puede ir a la página 2 sin
perder la búsqueda; cuando toca una fila, entonces se abre la ficha con portada grande y
«Abrir en Spotify».
**DoD:** backend `yarn lint && yarn type-check && yarn test` + e2e dirigido verdes; móvil
`yarn workspace @gymsheet/mobile type-check` y `lint` (incluye `check-theme`) verdes; tests nuevos
de música (`src/features/music/__tests__/*.test.tsx`) verdes; capturas en iPhone SE (375) y
15 Pro Max (430) de: carga, vacío, error, resultados, grid, tabla p.1 y p.2, ficha; doble
revisión (`../evidencia/doble-revision.md`).
**Estado:** TODO

### H4.S1 — Backend: búsqueda, filtro, orden, `scope=all`, páginas y lectura por id

**Repo:** `GymSheetBackend`, módulo `src/modules/music/`.
**CA:** `GET /music/playlists?scope=all&q=car&tipo=playlist&sort=titulo&page=2&pageSize=20`
devuelve `{items,total,page,pageSize}` filtrado, ordenado y estable; sin `page` el contrato actual
no cambia (compatibilidad con la app publicada).
**DoD:** `music.service.spec.ts` y `test/music-playlists.e2e-spec.ts` ampliados en verde; `yarn
type-check`, `yarn lint`; `migrations.registry.spec.ts` en verde.

| ID | Microtarea | CA (binario) | DoD (comando → esperado) | Estado |
|---|---|---|---|---|
| H4.S1.M1 | Migración `2026102400xx-music-search.ts`: índice GIN trigram sobre `repp_normalize(titulo)` en `community.music_playlists`; registrar en `migrations/index.ts` | `yarn migration:up` crea `ix_music_playlists_titulo_trgm`; `down` lo quita | `yarn migration:up && yarn migration:down && yarn migration:up` exit 0; `yarn test src/database/migrations` verde | TODO |
| H4.S1.M2 | `music.schemas.ts`: `playlistListQuerySchema` admite `q` (trim, ≤ 80), `tipo` (enum), `sort` (`recientes` \| `titulo` \| `autor`, default `recientes`), `scope` añade `all`, `page` (≥1) y `pageSize` (1..50) **excluyentes** con `cursor` | `page` + `cursor` juntos → 400; `q` de 81 chars → 400 | `yarn test music.schemas` (spec nuevo) verde | TODO |
| H4.S1.M3 | `music.repository.ts`: `listAll` (unión privadas del viewer + públicas visibles con filtro de bloqueos), `where` por `q` (`ILIKE` escapado sobre `repp_normalize(titulo)` y autor), filtro `tipo`, orden por lista blanca con desempate `id` | Misma consulta con `sort=titulo` dos veces → mismo orden; `q='%'` no devuelve todo | spec de repositorio con Postgres (e2e) verde | TODO |
| H4.S1.M4 | Modo página: `count(*)` + `OFFSET/LIMIT` cuando llega `page`; mapper devuelve `{items,total,page,pageSize}`; modo cursor intacto | `page=2&pageSize=20` sobre 25 filas → 5 items, `total=25` | e2e «páginas sin huecos ni repetidos» verde | TODO |
| H4.S1.M5 | `GET /music/playlists/:id` (UuidParamPipe): propia (cualquier visibilidad) o pública visible (bloqueos y moderación); si no, 404 | Privada ajena → 404; pública de bloqueado → 404 | e2e 3 casos (200/404/404) verde | TODO |
| H4.S1.M6 | Rate limit del buscador: `@Throttle` específico en `GET /music/playlists` cuando hay `q` (regla 90.1.14) | 61.ª petición/min con `q` → 429 | e2e dirigido verde | TODO |
| H4.S1.M7 | `docs/endpoints` o `docs/api-contracts.md`: documentar los nuevos parámetros y la respuesta paginada | Doc coincide con el esquema Zod | revisión manual + enlace en REPORTE | TODO |

### H4.S2 — Contrato compartido y servicio móvil

**CA:** `musicService.search(params)` y `musicService.get(id)` validan con Zod y tipan la respuesta;
el patrón cliente de URL acepta lo mismo que el servidor.
**DoD:** `yarn turbo run type-check test --filter=@gymsheet/schemas --filter=@gymsheet/mobile` verde.

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H4.S2.M1 | `packages/schemas/src/definitions/music.ts`: `musicPlaylistPagedSchema {items,total,page,pageSize}`, `musicSort`, `musicScope` con `all`; `SPOTIFY_URL_PATTERN` alineado con `spotify-url.ts` (embed, legacy user, `_`/`-`) y anclado al final | 6 URLs de la tabla del parser pasan/fallan igual en cliente y servidor | test nuevo `music.test.ts` en `packages/schemas` verde | TODO |
| H4.S2.M2 | `apps/mobile/src/api/services.ts` `musicService`: `list` acepta `{scope,q,tipo,sort,cursor,limit}`; nuevo `page({scope,q,tipo,sort,page,pageSize})`; nuevo `get(id)` | Llamadas construyen la query exacta (snapshot) | test de servicio con `fetch` falso verde | TODO |
| H4.S2.M3 | `features/music/use-music.ts`: `useMusicSearch` (infinite, clave incluye `q/tipo/sort/scope`), `useMusicPage` (query por página, `placeholderData: keepPreviousData`), `usePlaylist(id)`; `useDebouncedValue(q, 350)` como en el catálogo | Cambiar `q` resetea a página 1 | test de hooks verde | TODO |
| H4.S2.M4 | `packages/types/src/community.ts`: `ReportTargetKind` añade `'MUSIC_PLAYLIST'`; `ReportSheet` lo admite | `moderationService.report('MUSIC_PLAYLIST', id, 'SPAM')` compila y llega al backend | type-check + test verde | TODO |

### H4.S3 — Pantalla Música: buscador, chips, carriles, cuadrícula y tabla

**Composición (de arriba abajo):**
1. `ScreenHeader` «Música» con acción «Añadir» (se conserva).
2. **Buscador** `SearchField` parametrizado (`label`, `placeholder="Buscar playlists, álbumes, artistas…"`) con ✕; a la derecha un `IconButton` «Vista» que alterna cuadrícula/tabla (icono `grid`/`list`), 48 pt. Ambos pegados arriba (`heroBar` de `ScrollScreen` o `header` de `ListScreen`).
3. **Chips de tipo** (`FilterChip`, scroll horizontal): Todo · Playlists · Álbumes · Canciones · Artistas · Podcasts. Debajo, chip de orden («Recientes ▾») que abre hoja con 3 opciones.
4. **Sin búsqueda, vista cuadrícula:** carriles horizontales «Tuyas» (privadas + públicas propias) y «De la comunidad», cada uno con «Ver todo» que fija el filtro; debajo la cuadrícula completa 2 columnas (3 en `wide`).
5. **Con búsqueda:** secciones por tipo en el orden del chip, cabecera «Playlists · 12», máximo 6 por grupo + «Ver todos» (fija el chip de tipo).
6. **Vista tabla:** filas de 64 pt: portada 48, título (1 línea), «Tipo · autor», a la derecha «Solo tú» o fecha corta, chevron. Cabecera de columnas solo en `wide`. Pie: «Página X de Y» + ‹ › + números (máximo 5 visibles), 44 pt cada control.
7. Estados: skeleton con la forma de cada vista, vacío por contexto («Sin resultados para “cardio”» + «Borrar búsqueda»), error con reintento, offline (aviso + caché).

**CA:** como el CA del hito.
**DoD:** capturas de los 7 estados × 2 anchos; `check-theme` en cero.

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H4.S3.M1 | Adoptar el `SearchField` genérico de **H1.S2.M1** con `label="Buscar música"` y `placeholder="Buscar playlists, álbumes, artistas…"` | el buscador aparece bajo la cabecera | test verde | TODO |
| H4.S3.M2 | Adoptar `ViewToggle` de **H1.S2.M4** con clave `music.view` (`SegmentedPill` de dos iconos, 48 pt, `radiogroup`, háptico `selection`) | Reabrir la app conserva la vista | test verde | TODO |
| H4.S3.M3 | `features/music/music-header.tsx`: buscador + toggle + chips de tipo + chip de orden; expone `state {q,tipo,sort,view}` por un `useMusicFilters` (`useReducer`) | Cambiar tipo no borra `q` | test de reducer verde | TODO |
| H4.S3.M4 | `features/music/music-rail.tsx`: carril horizontal (`FlatList horizontal`, `snapToInterval`, tarjeta 148 pt) con título y «Ver todo» | Carril vacío no se pinta | test verde | TODO |
| H4.S3.M5 | `features/music/music-grid.tsx`: migra la cuadrícula a `InteractionsList numColumns={2|3}` con `onEndReached`, ancho desde `useScreenFrame()`; quita «Ver más» | En 430 pt y en 820 pt no hay desbordes (captura) | capturas + type-check | TODO |
| H4.S3.M6 | `features/music/music-table.tsx`: filas `PlaylistRow` + `components/page-controls.tsx` (nuevo, reutilizable: «Página X de Y», ‹ ›, números, `accessibilityLabel`) | Página 2 muestra items 21-25 con 25 totales | test con datos falsos verde | TODO |
| H4.S3.M7 | `features/music/music-search-results.tsx`: agrupa por `tipo`, 6 por grupo + «Ver todos»; `accessibilityLiveRegion` anuncia «12 resultados» | Grupo sin items no aparece | test verde | TODO |
| H4.S3.M8 | `music-screen.tsx` recompuesto: `ListScreen` con `header` = cabecera; quita las dos pestañas (sustituidas por carriles y chip «Tuyas» en el filtro de alcance) | La pantalla no usa `.map()` para la cuadrícula | revisión de diff + capturas | TODO |
| H4.S3.M9 | Estados: `EmptyState` por contexto (3 variantes), `ErrorState`, offline, skeleton grid y tabla | Cada uno capturado | capturas | TODO |
| H4.S3.M10 | **Precondición medida en H0:** con `routinesV2` apagada (valor de producción) Música no tiene ninguna entrada. Entradas: NavRow «Música» en el perfil (sección de accesos) y acceso en `home.tsx` solo si hay ≥ 1 playlist; se mantiene el ⋯ de Rutinas | Dos entradas nuevas navegan a `/routines/musica` | Maestro `16-musica.yaml` paso 1 | TODO |

### H4.S4 — Ficha de playlist

**Ruta nueva:** `app/(app)/(tabs)/routines/musica/[id].tsx` (y mover la lista a `musica/index.tsx`).
**Composición:** `ScrollScreen hero=` con portada cuadrada 60 % del ancho centrada sobre degradado
(`musicHero` tokens), título `display`, «Playlist · autor · fecha», chip «Solo tú» si privada;
`HeroBar` con atrás y ⋯; CTA fijo abajo «Abrir en Spotify» (volt, 48 pt); sección «Rutinas que la
recomiendan» (viene de H5, se pinta solo si hay datos); si es mía: «Cambiar nombre», «Quién la ve»,
«Quitar»; si es ajena: «Denunciar».

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H4.S4.M1 | Tokens `musicHero` en `src/theme/extras.ts` (degradado + velo), con contraste comentado | `check-theme` en cero; `contrast.test.ts` cubre texto sobre el velo | `yarn workspace @gymsheet/mobile test:theme` verde | TODO |
| H4.S4.M2 | `features/music/playlist-detail-screen.tsx` con `usePlaylist(id)`: carga, 404 («Esta playlist ya no está»), error, datos | 404 muestra estado propio y botón «Volver» | test verde + capturas | TODO |
| H4.S4.M3 | `PlaylistCard`/`PlaylistRow` navegan a la ficha; «Abrir en Spotify» queda en la ficha y en la acción secundaria de la tarjeta (icono `open-outline`) | Tocar tarjeta → ficha; tocar icono → Spotify | test verde | TODO |
| H4.S4.M4 | Editar título en `ManageSheet` (`PATCH titulo`), con `Input` y validación 1..120 | Título cambia y persiste tras recargar | prueba manual `UI → PATCH → GET → UI` registrada | TODO |
| H4.S4.M5 | Denunciar playlist ajena con `ReportSheet` (`MUSIC_PLAYLIST`) | Denuncia llega a `/me/reports` (200) | prueba manual registrada | TODO |

### H4.S5 — Pruebas, accesibilidad y evidencia

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H4.S5.M1 | Vitest de pantalla con el shim `rn-dom` del chat: buscar, cambiar vista, paginar, abrir ficha, vacío, error | 6 tests | `yarn workspace @gymsheet/mobile vitest --config src/features/music/vitest.config.mts` verde | TODO |
| H4.S5.M2 | Maestro `16-musica.yaml`: entrar, buscar, tabla, página 2, ficha, abrir Spotify (solo verificar que lanza) | flujo pasa en simulador | salida de Maestro en `evidencia/` | TODO |
| H4.S5.M3 | Accesibilidad: VoiceOver recorre buscador → chips → toggle → lista; cada control ≥ 44; `accessibilityLabel` de portadas | checklist WCAG 2.2 AA de `repp-diseno` §Checklist | `evidencia/a11y-musica.md` | TODO |
| H4.S5.M4 | Doble revisión de capturas (regla 35 / skill `critical-double-review`) por `visual-reviewer` | nota ≥ ACEPTABLE CON RESERVAS en todas | `evidencia/doble-revision.md` | TODO |

---

## H5 — Playlist recomendada por rutina

**CA:** Dado el dueño de una rutina, cuando toca «Elegir música» en la ficha y selecciona una
playlist, entonces la ficha muestra la tarjeta «Música para esta rutina» para él y para cualquiera
que la vea (si la playlist es pública), persiste tras recargar y se abre en Spotify; dado un lector
de una rutina pública cuya playlist es privada de otro, entonces no ve ninguna playlist.
**DoD:** migración aplicada y `migrations.registry.spec.ts` verde; e2e de rutinas con 5 casos;
`UI → PATCH → GET → recarga → UI` registrado; capturas; doble revisión.
**Estado:** TODO

### H5.S1 — Backend

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H5.S1.M1 | Migración `2026102400xx-routine-recommended-playlist.ts`: `ALTER TABLE training.routines ADD COLUMN recommended_playlist_id uuid NULL REFERENCES community.music_playlists(id) ON DELETE SET NULL` + índice `ix_routines_recommended_playlist`; `down` inverso; registrar | up/down/up exit 0 | `yarn migration:up` + registry spec | TODO |
| H5.S1.M2 | `routine.model.ts`: columna + `belongsTo` playlist; `training.schemas.ts` (`create`, `createComplete`, `update`) aceptan `playlistRecomendadaId: uuid \| null` | Zod rechaza no-uuid (400) | spec de schemas verde | TODO |
| H5.S1.M3 | `training.service.ts` `updateRoutine`/`create`: valida que la playlist exista y sea visible para el autor (propia o pública); si no, 404 `MUSIC_PLAYLIST_NOT_FOUND` | Playlist privada ajena → 404 | e2e verde | TODO |
| H5.S1.M4 | `training.mapper.ts` `mapRoutineToResponse`: `playlistRecomendada: MusicPlaylistSummary \| null` resuelta por visibilidad para **el viewer** (privada de otro, oculta o de bloqueado → `null`) | Lector ve `null` donde el dueño ve la playlist | e2e 3 casos verde | TODO |
| H5.S1.M5 | `routine-publication.service.ts` copia: hereda `recommended_playlist_id` solo si la playlist es PUBLIC y visible | Copia de rutina con playlist privada → `null` | e2e verde | TODO |
| H5.S1.M6 | `routine-catalog.repository.ts`: la tarjeta del catálogo expone `tienePlaylist: boolean` (para el chip «♪») | Catálogo devuelve el booleano | spec verde | TODO |
| H5.S1.M7 | `GET /music/playlists/:id` suma `rutinasQueLaRecomiendan: {id,nombre}[]` (máx. 5, visibles) | Lista respeta visibilidad de rutinas | e2e verde | TODO |

### H5.S2 — Contrato compartido y asistente de rutina

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H5.S2.M1 | `packages/types/src/training.ts` + `packages/schemas/src/definitions/training.ts`: `playlistRecomendada`; `catalog.ts`: `tienePlaylist` | type-check de web y móvil verde | `yarn turbo run type-check` | TODO |
| H5.S2.M2 | `packages/api-client/src/routine-services.ts` y `apps/mobile/src/api/services.ts` `routineService.update` aceptan `playlistRecomendadaId` | request body incluye el campo | test de servicio verde | TODO |
| H5.S2.M3 | `packages/hooks/src/routine-draft/model.ts` + `save.ts`: campo opcional en el borrador | borrador persiste el id | test de `routine-draft` verde | TODO |
| H5.S2.M4 | Paso «Duración» del asistente (`steps-basic.tsx` `DurationStep`): `Section` «Música (opcional)» con botón «Elegir playlist» que abre `PlaylistPickerSheet` | se puede crear rutina con y sin playlist | Maestro `08-crear-rutina` extendido | TODO |

### H5.S3 — Ficha de rutina y selector

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H5.S3.M1 | `features/music/playlist-picker-sheet.tsx`: `BottomSheet` con el mismo buscador y filas de H4 (reutiliza `music-header` reducido + `PlaylistRow`), selección única, «Quitar música» si ya hay | elegir → cierra → ficha actualizada | test verde | TODO |
| H5.S3.M2 | `routine-detail-screen.tsx`: `DetailSection` «Música para esta rutina» entre `DayCard`s y `DetailSocial`: tarjeta horizontal (portada 72, título, autor, botón «Abrir en Spotify»); dueño ve «Cambiar»/«Quitar»; sin playlist y dueño: estado vacío que orienta («Elegí la música que acompaña esta rutina») | lector sin playlist no ve la sección | capturas dueño/lector | TODO |
| H5.S3.M3 | Tarjeta del catálogo (`RoutineCard`): `MediaChip` «♪» si `tienePlaylist` | chip visible solo cuando aplica | captura | TODO |
| H5.S3.M4 | Ficha de playlist (H4.S4): sección «Rutinas que la recomiendan» con `NavRow` a cada rutina | navega a `/routines/[id]` | test verde | TODO |
| H5.S3.M5 | Pantalla de entrenamiento activo (`features/programs/active-routine-screen.tsx`): fila compacta «♪ Playlist · Abrir» bajo la cabecera cuando la rutina activa tiene playlist | aparece solo con playlist | captura | TODO |

### H5.S4 — Evidencia

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H5.S4.M1 | Demostración `UI → PATCH /routines/:id → GET → recarga → UI` con dos cuentas (dueño y lector) | las cuatro capas coinciden | `evidencia/h5-mutacion.md` | TODO |
| H5.S4.M2 | Regresión: `yarn test` backend completo; Maestro `08`, `11`, `12`, `14` (crear, catálogo, detalle, copiar) | verdes | salidas en `evidencia/` | TODO |
| H5.S4.M3 | Doble revisión visual de la sección y del selector | ≥ ACEPTABLE CON RESERVAS | `evidencia/doble-revision.md` | TODO |

## Riesgos propios de H4/H5

| Riesgo | Impacto | Mitigación |
|---|---|---|
| `count(*)` en cada página sobre una tabla que crece | latencia de la tabla | índice parcial existente + `pageSize ≤ 50`; medir p95 con `test/load/http-load-smoke.mjs` |
| Búsqueda por autor exige JOIN con `usuarios` y `shortenName` | consulta más cara | buscar por `repp_normalize(nombre)` indexado o limitar a título en la primera entrega (decidir con medición) |
| Spotify oEmbed no da número de pistas ni duración | la tabla no puede mostrar «N canciones» | columnas: Título · Tipo · Autor · Fecha; no se inventa el dato |
| La app publicada usa `scope=public|private` | romper clientes viejos | parámetros nuevos opcionales; contrato actual intacto |
| Trade dress de Spotify | riesgo legal/identidad | D-M4; revisión de `visual-reviewer` con la lista anti-clon |
