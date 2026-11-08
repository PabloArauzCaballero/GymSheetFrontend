# Auditoría — música (2026-10-24, solo lectura)

No hay música en la web. Existe solo en móvil, `packages/schemas` y el módulo `music` del backend.
Nada vincula rutina y playlist en ninguna capa.

## Pantalla móvil
- Ruta `app/(app)/(tabs)/routines/musica.tsx` → `MusicScreen`; única entrada: menú ⋯ de Rutinas (`routines-catalog-screen.tsx:217-223`, badge lila en `more-sheet.tsx:87-94`). La ficha de rutina no tiene entrada.
- `music-screen.tsx`: `ScrollScreen` + `BackLink` + `ScreenHeader` («Añadir» volt), `SegmentedPill` Todas/Compartidas; dos consultas siempre (public y private); cuadrícula a mano (`flexWrap`, 2 col) con ancho desde `gutter` fijo (bug en tablet/apaisado: ignora `maxContentWidth` 560); «Ver más» manual; contador de cargados. Sin buscador, orden, lista/tabla ni ficha.
- `playlist-card.tsx`: portada cuadrada (expo-image, shimmer, respaldo degradado `muscleGradients` + nota), título 2 líneas, «Tipo · autor», chip «Solo tú», ⋯ si es mía (32×32). Abrir = `Linking.openURL(url)`.
- Añadir (`add-playlist-sheet.tsx`): URL + nombre opcional + visibilidad; `SPOTIFY_URL_PATTERN` cliente más estricto que el servidor (rechaza `/embed/`, `/user/<n>/playlist/`, `_`/`-`) y sin ancla final. Errores 409/400 mapeados. Solo Spotify.
- Gestión: abrir, cambiar visibilidad, quitar. Sin editar título (la API lo acepta) ni denunciar (el front no tiene `MUSIC_PLAYLIST` en `ReportTargetKind`).
- Estados: 4 skeletons, error con reintento, vacío por pestaña con CTA.

## Datos
- `use-music.ts`: `useMusicPlaylists(scope,20)` infinite por cursor, staleTime 60 s; mutaciones create/setVisibility/remove.
- `musicService` (`services.ts:1164-1177`): `GET /music/playlists?scope&limit&cursor`, `POST`, `PATCH /:id`, `DELETE /:id`.
- Contrato `MusicPlaylist {id,url,tipo,titulo,imagenUrl,visibilidad,esMia,creadaEn,autor}`; página `{items,nextCursor}`.
- Backend `src/modules/music/`: controller `music/playlists` (GET/POST/PATCH/DELETE), guardas globales JWT; query `scope public|private`, `cursor ≤200`, `limit 1..50`; **sin q, tipo, sort, total, GET /:id**. Servicio: keyset cursor, `parseSpotifyUrl` (https, open.spotify.com/spotify.link, id base62 22), oEmbed 3 s para título/portada, duplicado 409, owner-only update/remove (404). Repositorio SQL crudo, orden `created_at DESC, id DESC`, filtro de bloqueos mutuos; público es global entre gimnasios. Tabla `community.music_playlists` (migración `202610150002`), unique `(user_id,url)`, moderación `MUSIC_PLAYLIST` cableada.

## Rutina
- `training.routines` sin columna de música; `Routine`/`routineSchema`/`RoutineCard`/`RoutineDraft` sin campo. Para añadirlo: migración nueva (plantilla `202610180101-chat-location-label.ts`, registro en `migrations/index.ts`, `migrations.registry.spec.ts`), `routine.model.ts`, `training.schemas.ts` (create/createComplete/update), `training.mapper.ts:132-176`, `training.service.ts:151-164`, `routine-publication.service.ts` (copia), `routine-catalog.repository.ts`; front: `packages/types/src/training.ts`, `packages/schemas/.../training.ts`, `services.ts:355` `routineService.update`, `packages/api-client/src/routine-services.ts:30`, `routine-draft/model.ts` y `save.ts`.
- Superficies: `routine-detail-screen.tsx` (DetailHeader → VersionBanner → Week/DayCard → DetailSocial → Programar), `DetailSection`, `MoreSheet`; wizard `nombre → objetivo → duracion → dias → revision` (`DurationStep` con `Section`s).

## Primitivas
- `ListScreen` (FlatList virtualizada con header/empty/onEndReached), `InteractionsList` (numColumns 1|2), `Segmented`, `SegmentedPill`, `GridTile`, `NavRow`, `FilterChip`, `SearchField` (texto fijo), `useDebouncedValue(…,350)`, `HeroBar/HeroParallax`, `DetailHero`. Sin toggle grid/lista. Web: `table.tsx`, `pagination.tsx` (por páginas).

## Tokens / literales
- Tema móvil (`spacing` 2…48, `gutter` 24, `comfortableTouchTarget` 48, `radii`, `muscleGradients`, `accentHues.lilac/purpleDeep`). Sin token verde Spotify. Literales en música: 32×32, hitSlop 8, `alpha(ink.black,0.55)`, `size*0.36`, transition 180, skeleton 14/12.

## Tests
- Móvil: ninguno (ni Maestro). Backend: `music.service.spec.ts`, `spotify-url.spec.ts`, `test/music-playlists.e2e-spec.ts` (auth, aislamiento, 409, 404, URL inválida, cursor, bloqueo, denuncia).

## Huecos
- Solo frontend: toggle grid/lista, virtualizar, ancho en tablet, ficha con hero, carriles, filtro por tipo (parcial), editar título, denunciar, alinear patrón de URL, entradas, tests.
- Backend: `q`, `tipo`, `sort`, `total`/páginas, `scope=all`, `GET /:id`, `recommended_playlist_id` en rutina con regla de visibilidad, metadatos ricos (Web API de Spotify), otros proveedores.
