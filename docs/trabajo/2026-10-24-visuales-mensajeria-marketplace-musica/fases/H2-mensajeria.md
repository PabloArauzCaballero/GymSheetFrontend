# H2 — Mensajería estilo Tinder (mejorada)

**Resultado observable:** una persona abre «Mensajes» desde un lugar obvio (badge de no leídos
incluido), ve arriba a sus matches nuevos sin conversación, debajo las conversaciones ordenadas
con no leídos marcados, y al entrar a un chat vacío encuentra la cara grande de la otra persona,
la fecha del match y rompehielos; mientras escribe ve «escribiendo…» como burbuja animada, y bajo
su último mensaje «Enviado / Visto». Desde ⋯ del chat puede dejar de hacer match, bloquear o
denunciar sin salir a otra pantalla.

**Referencia:** Tinder (fila horizontal «Nuevos matches» con contador, lista con nombre en negrita
y punto cuando hay no leídos, cabecera centrada con avatar y nombre, fecha del match en el cuerpo,
rompehielos, estado «Enviado/Visto» textual, GIF, ⋯ con Desemparejar/Denunciar). **Lo que se
mejora respecto de Tinder:** responder citando, reacciones, notas de voz, ubicación, mensajes que
desaparecen, recibos configurables y «Entrenemos juntos» ya existen y se conservan; Tinder no los
tiene. **Lo que no se copia:** rosa/naranja de marca, llama, tipografía Proxima.

**Kill-test:** recibir un mensaje con la app en «Comunidad» y que ningún badge cambie; o entrar a
un chat vacío y no saber cuándo hicimos match ni con quién hablo sin tocar el nombre.

## Estado real (auditado 2026-10-24, detalle en `../evidencia/auditoria-mensajeria.md`)

| Hecho | Dónde |
|---|---|
| No hay pestaña ni entrada principal de mensajes: icono en la cabecera de Comunidad (`/comunidad-mensajes`) y `NavRow` en Perfil (`/chat`). Dos listas con lógica duplicada | `app/(app)/(tabs)/comunidad.tsx:1006-1036`, `(tabs)/profile.tsx:251`, `app/(app)/chat/index.tsx`, `app/(app)/comunidad-mensajes.tsx:91-124` |
| El badge de la pestaña Comunidad cuenta likes + visitas; el punto del icono significa «solicitudes pendientes». Los no leídos no se cuentan en ningún lado | `(tabs)/_layout.tsx:196,292`, `components/interactions-counts.tsx:41` |
| `ConversationSummary` **no tiene** `unreadCount`, ni `matchedAt`, ni «es mi turno» | `packages/schemas/src/definitions/social.ts:181-201` |
| La lista es `.map()` dentro de `Card` en `ScrollScreen`, sin virtualizar, sin paginar, sin buscador, sin orden propio, sin realtime (solo `staleTime` 30 s / pull) | `chat/index.tsx:37-49`, `providers/app-providers.tsx:27-39` |
| Fila: avatar 52 reimplementado, nombre, preview, hora. Sin negrita de no leído, sin «Tú:», sin tick, sin glifo de media | `components/chat-conversation-row.tsx` |
| Hilo: cabecera estilo WhatsApp (avatar 38 en línea), burbujas con cola, ticks azules `#34b7f1`, «escribiendo…» solo como texto de cabecera | `features/chat/chat-header.tsx`, `message-bubble.tsx`, `theme/extras.ts:264` |
| Hoja de contacto: apodo, desaparecer, recibos, entrenar juntos, ver perfil. **Sin bloquear, denunciar persona ni desemparejar** (viven en `perfil/[userId].tsx:134-146` y en «Desconectar» de Conexiones) | `features/chat/chat-sheets.tsx:237-392` |
| Adjuntar: emoji, foto, cámara, ubicación, vista única. **Sin GIF ni stickers**; el backend ya tiene catálogo de stickers (`gym.cheer.v1`, `gym.strong.v1`) pero el esquema móvil no conoce el tipo `sticker` | `features/chat/chat-attach-menu.tsx`, `social.ts:214-270`; backend H7.S1.M3 del plan 2026-10-08 |
| Sin burbuja pendiente/optimista para texto (spinner en el compositor); sin progreso de subida; sin reintento | `chat/[id].tsx:1074-1097` |
| Visor de imagen sin zoom/deslizar/cerrar; ubicación sin miniatura de mapa; audio sin forma de onda | `features/chat/message-content.tsx` |
| Modal «¡Match!» solo en Comunidad; no hay celebración cuando el otro acepta después, ni evento realtime de match | `comunidad.tsx:365-512` |
| Avatares reimplementados en 5 sitios en vez de `PersonAvatar`; `IconButton` local; `Text` de RN en vez de `@/components/text`; ~40 números mágicos; `colors.background` sobre volt donde va `accentContrast()` | ver §5 de la auditoría |
| Tests: compositor, lugar, hilo (22 KB) y nota de voz; **sin tests** de lista, hub, cabecera, visor, borrar, denunciar, reenviar, modal de match | `src/features/chat/__tests__/` |
| Web: hub `/chat` con 3 pestañas; sin voz, sin responder, sin reacciones interactivas, sin reenviar, sin borrar, sin typing | `apps/web/src/features/chat/` |

## Lo que se preserva sin discusión

- Socket con ticket de un uso (`use-chat-socket.ts:80-88`), Bearer de media desde SecureStore
  (`use-media-access-token.ts`), `resolveChatMediaUrl`.
- Denuncia de mensaje cierra el chat para ambos; revocación/404 limpian historial, media y visor.
- Bloqueo, denuncia de persona, «Desconectar» y «Personas bloqueadas» siguen alcanzables (se **suman**
  entradas, no se mueven).
- Chats de sistema de solo lectura (`canWrite=false`), vista única, política de recibos,
  deduplicación/tombstones/edición, re-join al reconectar, `markRead`.
- Los rodeos de modales encadenados en iOS (menú adjuntar inline, lugar y reenviar como pantallas,
  `afterActionsSheet`). Los tests los afirman.
- `testID`s existentes (`chat-attach-*`, `chat-message-*`, `chat-composer-*`, …).
- Voz: de tú, verbo primero.

## Decisiones de diseño (D-C*)

- **D-C1 — Una sola pantalla «Mensajes».** `/comunidad-mensajes` pasa a ser la única lista y
  `/chat` (index) redirige a ella; se borra la duplicación. La entrada principal: **icono de
  mensajes con badge numérico en la cabecera de las cuatro pestañas** (`ScreenHeader` acción) y
  se mantiene la de Perfil. No se añade quinta pestaña: la barra tiene cuatro y el cliente no lo
  pidió (ambigüedad A-C1: si Pablo quiere pestaña «Mensajes», se cambia `(tabs)/_layout.tsx`).
- **D-C2 — «Nuevos matches».** Carril horizontal arriba con avatares redondos grandes (72 pt) y
  nombre, badge con el total; el primer item es «Likes» con desenfoque y contador cuando hay likes
  recibidos (lleva a Interacciones). Un «match nuevo» es una conexión `ACCEPTED` **sin mensajes**;
  para no derivarlo en el cliente con tres consultas, el backend añade a `ConversationSummary`:
  `unreadCount`, `matchedAt`, `lastMessageFromMe`, `lastMessageType`. Las conversaciones con
  `lastMessageAt == null` alimentan el carril; el resto, la lista.
- **D-C3 — Lista.** `ListScreen` virtualizada; fila con `PersonAvatar` 56, nombre (negrita si
  `unreadCount>0`), preview con «Tú: » y tick cuando es mío, glifo según `lastMessageType`
  (📷 foto, 🎤 voz, 📍 ubicación, ♪ no aplica), hora, punto volt + número si hay no leídos;
  deslizar a la izquierda: «Silenciar» (local, A-C2) y «Más» (hoja con Desemparejar / Bloquear /
  Denunciar). Buscador arriba (filtra por nombre, local). Pestañas Solicitudes/Conexiones se
  mantienen como segmentos secundarios bajo el carril.
- **D-C4 — Cabecera del hilo.** Avatar 40 **centrado** con nombre debajo (toque → ficha), «en
  línea / escribiendo… / últ. vez» como segunda línea, atrás a la izquierda, a la derecha
  «Entrenemos juntos» (icono) y ⋯. ⋯ abre hoja con: Ver perfil · Apodo · Mensajes que desaparecen
  · Recibos de lectura · Silenciar · **Desemparejar** · **Bloquear** · **Denunciar a la persona**
  (las tres últimas con confirmación y copy honesto: «Se cierra el chat para los dos»).
- **D-C5 — Hilo vacío.** Encabezado de cuerpo: avatar 96, «Hicieron match el 12 de octubre»
  (`matchedAt`), 2 chips de perfil (objetivo, sucursal) y **tres rompehielos** del dominio
  (`packages/domain/src/chat-icebreakers.ts`, deterministas por par de usuarios, de tú): tocar uno
  lo pone en el compositor, no lo envía.
- **D-C6 — Estados de entrega.** Se mantienen los ticks dentro de la burbuja (ya hay tests y
  política de recibos) y **se añade** una línea de estado bajo el último mensaje propio: «Enviado»,
  «Entregado», «Visto 14:02» (texto, no solo color: regla 95.4.6). Color del tick pasa de
  `#34b7f1` a `accentPolicy.ink` (deuda de token).
- **D-C7 — Escribiendo.** Burbuja «…» animada (tres puntos, `Reanimated`, respeta reduce motion)
  al final de la lista además del texto de cabecera.
- **D-C8 — Envío optimista.** Burbuja pendiente (opacidad 0,6 + reloj) con `clientRequestId` (el
  backend ya lo soporta de forma idempotente); en fallo, estado «No se envió · Reintentar / Borrar».
  Media: barra de progreso en la burbuja.
- **D-C9 — GIF y stickers.** Stickers del catálogo del servidor: **IN** (solo falta el tipo en el
  esquema móvil y el panel). GIF (Giphy/Tenor) exige proveedor externo, clave y proxy en backend →
  **decisión de negocio** `DECISION_REQUIRED` (A-C3). Se deja el hueco en el panel de adjuntar
  solo si se aprueba; no se pintan botones muertos.
- **D-C10 — Match en tiempo real.** Evento socket `match:new` en el namespace `/chat` (el backend
  ya detecta el match en `SocialService.swipe`) y la pantalla «¡Match!» se extrae de Comunidad a
  `components/match-celebration.tsx` para dispararse desde cualquier pantalla.
- **D-C11 — Primitivas.** Todo avatar de chat usa `PersonAvatar`; `IconButton` compartido; `Text`
  de la casa; tokens nuevos en `theme/extras.ts` (`chatSizes`: avatarRow 56, avatarHeader 40,
  avatarEmpty 96, bubbleRadius 18/6, tail 8×13, media 240…).

## Orden de dependencias

```
H2.S1 backend (summary ampliado, match:new, sticker en contrato)
  └─► H2.S2 contrato + servicios + hooks
        ├─► H2.S3 Mensajes (carril, lista, buscador, swipe, badge global)
        ├─► H2.S4 hilo (cabecera, vacío, typing, estados, optimista, stickers, visor)
        └─► H2.S5 match realtime + ⋯ con moderación
              └─► H2.S6 tests, a11y, evidencia
```

---

**CA del hito:** como el resultado observable, demostrado con dos cuentas en dos dispositivos
(simulador iOS + Android o segundo simulador) y backend real.
**DoD del hito:** backend `lint/type-check/test` + e2e de chat verdes; móvil `type-check`, `lint`
(check-theme en cero), vitest de chat verde **sin tocar aserciones existentes**; Maestro `05-social`
y nuevo `17-mensajes.yaml` verdes; capturas 375/430 de: Mensajes (carga, vacío, con datos, buscador,
swipe), hilo vacío, hilo con datos, typing, estado Enviado/Visto, pendiente/fallo, hoja ⋯, Match;
doble revisión; `evidencia/h2-mutaciones.md` con enviar → socket → persistencia → recarga → UI.
**Estado:** TODO

### H2.S1 — Backend (`GymSheetBackend/src/modules/chat`, `social`)

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H2.S1.M1 | `ConversationSummary` suma `unreadCount` (mensajes del otro posteriores a mi último `read`), `matchedAt` (fecha `ACCEPTED` de la conexión), `lastMessageFromMe`, `lastMessageType` | Enviar 3 mensajes a B → B ve `unreadCount: 3`; B abre y marca leído → 0 | e2e `chat-summary.e2e-spec.ts` 3 casos verde | TODO |
| H2.S1.M2 | `GET /me/conversations/unread-count` → `{total}` (para el badge; barato, sin cargar la lista) | total coincide con la suma de `unreadCount` | e2e verde | TODO |
| H2.S1.M3 | Evento socket `conversation:updated {conversationId, summary}` a ambos participantes al crear/leer/borrar mensaje (para que la lista se mueva en vivo) | lista de B recibe el evento al enviar A | e2e socket verde | TODO |
| H2.S1.M4 | Evento `match:new {connectionId, conversationId, otherUser}` emitido a los dos al producirse el match en `SocialService.swipe` y en aceptar solicitud | ambos sockets reciben el evento una vez | e2e verde | TODO |
| H2.S1.M5 | `PUT /me/conversations/:id/mute` `{muted: boolean}` **solo si** se aprueba A-C2 servidor; si no, silenciar es local y esta fila se marca DESCARTADO con motivo | — | — | TODO |
| H2.S1.M6 | Documentar contrato en `docs/api-contracts.md` y `docs/contracts` | doc = Zod | revisión | TODO |

### H2.S2 — Contrato compartido, servicios y hooks móviles

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H2.S2.M1 | `social.ts`: `conversationSummarySchema` con los 4 campos (opcionales en cliente para tolerar backend viejo); `chatMessageSchema.type` añade `'sticker'` + `stickerId` | parse de payload viejo y nuevo pasa | test `packages/schemas` verde | TODO |
| H2.S2.M2 | `chatService.unreadCount()`, `useUnreadTotal()` (query 30 s + invalidación por socket) | badge cambia al recibir mensaje | test hook verde | TODO |
| H2.S2.M3 | `hooks/use-conversations-socket.ts`: socket **de lista** (ticket, namespace `/chat`, eventos `conversation:updated`, `match:new`, `presence:update`) que actualiza la caché `['chat','conversations']` sin refetch | mensaje entrante reordena la lista sin pull | test con socket falso verde | TODO |
| H2.S2.M4 | `packages/domain/src/chat-icebreakers.ts`: 12 rompehielos de entrenamiento, elección determinista por `hash(userA,userB)` → 3 | misma pareja → mismos 3 | test de dominio verde | TODO |
| H2.S2.M5 | `features/chat/stickers.ts`: catálogo local `gym.cheer.v1`, `gym.strong.v1` (assets vectoriales propios en `src/components/brand`), `sendSticker(id)` → `POST /messages` `{type:'sticker', stickerId}` | ID desconocido no se ofrece | test verde | TODO |

### H2.S3 — Pantalla «Mensajes»

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H2.S3.M1 | Tokens `chatSizes` + `IconButton` compartido en `comunidad-mensajes`; borrar `IconButton` local; avatares → `PersonAvatar` | `check-theme` en cero; grep de `AVATAR_SIZE` en chat = 0 | lint + grep | TODO |
| H2.S3.M2 | `features/chat/new-matches-rail.tsx`: carril horizontal (72 pt, anillo volt si `unreadCount>0`, nombre 1 línea), item 0 «Likes» con contador y desenfoque (`expo-blur`), «N nuevos matches» como título | sin matches nuevos el carril no se pinta | test verde + captura | TODO |
| H2.S3.M3 | `components/chat-conversation-row.tsx` v2: `PersonAvatar` 56 con punto en línea, nombre negrita condicional, preview «Tú: ✓✓ texto» / glifo de tipo, hora relativa, badge numérico | 4 variantes capturadas (no leído, mío visto, media, sistema) | test de fila verde | TODO |
| H2.S3.M4 | Deslizar fila (`react-native-gesture-handler` `Swipeable`): «Silenciar» y «Más» → hoja (Desemparejar / Bloquear / Denunciar / Ver perfil); accesible por acciones de accesibilidad | VoiceOver ofrece las 4 acciones | test verde | TODO |
| H2.S3.M5 | `SearchField` arriba («Buscar conversaciones»), filtro local por nombre/apodo, con ✕ | buscar «an» filtra | test verde | TODO |
| H2.S3.M6 | `comunidad-mensajes.tsx` → `ListScreen` con `header` = cabecera + carril + segmentos (General / Solicitudes / Conexiones), lista virtualizada ordenada por `lastMessageAt desc` (matches nuevos arriba del carril, no en la lista) | 200 conversaciones falsas scrollean sin tirones (medido con `perf monitor`) | captura + nota | TODO |
| H2.S3.M7 | `/chat` (index) redirige a `/comunidad-mensajes` (`Redirect`); se borra la lista duplicada; las rutas `/chat/[id]`, `/chat/lugar`, `/chat/reenviar` no cambian | todos los `router.push('/chat')` llegan a Mensajes | grep + Maestro | TODO |
| H2.S3.M8 | Badge global: `ScreenHeader` de las 4 pestañas gana acción «Mensajes» con `useUnreadTotal()` (número, máx. «99+»); el badge de Comunidad **deja de contar** solicitudes como mensajes (mantiene likes+visitas) | enviar desde B → badge en A sube sin tocar nada | vídeo corto o 2 capturas | TODO |
| H2.S3.M9 | Estados: skeleton con forma de fila + carril, vacío con CTA «Ir a Conocer», error, offline | capturas | capturas | TODO |
| H2.S3.M10 | Modal «N personas visitaron tu perfil» al entrar → aviso inline (como web) | no hay modal al entrar | test verde | TODO |

### H2.S4 — Hilo

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H2.S4.M1 | `chat-header.tsx` v2: centrado (avatar 40 + nombre + estado), atrás, «Entrenemos juntos», ⋯; `PersonAvatar` | test existente «typing reemplaza estado» sigue verde | vitest hilo verde | TODO |
| H2.S4.M2 | `features/chat/thread-intro.tsx`: avatar 96, «Hicieron match el …» (`matchedAt`; si falta, «Conectaron el …» con `createdAt`), 2 chips de perfil, 3 rompehielos (`PressableScale`, 44 pt) → ponen texto en el compositor | se muestra solo con 0 mensajes | test verde + captura | TODO |
| H2.S4.M3 | `features/chat/typing-bubble.tsx`: tres puntos con desfase 120 ms, `useReducedMotion` → estático «…»; se monta al final de la lista invertida cuando `typing` | aparece/desaparece con `typing:update` | test verde | TODO |
| H2.S4.M4 | Línea de estado bajo el último mensaje propio («Enviado» / «Entregado» / «Visto hh:mm»), `accessibilityLiveRegion="polite"`; tick pasa a `accentPolicy.ink` y `readReceiptTick` se elimina | respeta política de recibos (si el otro los desactivó, nunca dice «Visto») | tests de recibos existentes + 2 nuevos verdes | TODO |
| H2.S4.M5 | Envío optimista de texto con `clientRequestId` (uuid) y burbuja pendiente; fallo → «No se envió» con Reintentar/Borrar; dedupe por `clientRequestId` cuando llega el eco | matar la red tras enviar muestra el estado de fallo; reintentar envía una sola vez (backend idempotente) | test con socket/REST falsos verde + `evidencia/h2-mutaciones.md` | TODO |
| H2.S4.M6 | Progreso de subida en burbuja de media (`onUploadProgress` del cliente HTTP; si no existe, indeterminado honesto) | barra visible durante la subida | captura | TODO |
| H2.S4.M7 | Panel adjuntar: sexto item «Stickers» que abre `StickerSheet` (2 del catálogo + hueco de futuros); burbuja de sticker 120 pt sin fondo | el test «"+" muestra exactamente cinco items» se **actualiza a seis** con la aserción de cada uno cableado (no se debilita) | vitest compositor verde | TODO |
| H2.S4.M8 | Visor de imagen: pinch-zoom y pan (`gesture-handler`), deslizar hacia abajo para cerrar, botón cerrar 44 pt, «Guardar» (`expo-media-library`, pide permiso) — **no** disponible en vista única | guardar escribe en el carrete; vista única no muestra «Guardar» | prueba manual registrada | TODO |
| H2.S4.M9 | Ubicación: miniatura estática con `react-native-maps` (`MapView` no interactivo, `liteMode` en Android) 240×140 + etiqueta | se ve el pin | captura | TODO |
| H2.S4.M10 | Audio: forma de onda falsa determinista por `id` (barras) **declarada** como decorativa (no hay datos de amplitud) + velocidad 1×/1.5×/2× | velocidad cambia la reproducción | prueba manual | TODO |
| H2.S4.M11 | Tokens: `message-bubble`, `chat-composer`, `media-preview`, `chat-attach-menu` sin números mágicos; `colors.background` sobre volt → `accentContrast()` | `check-theme` en cero; grep de literales | lint | TODO |

### H2.S5 — Match en vivo y moderación desde el chat

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H2.S5.M1 | Extraer `MatchModal` de `comunidad.tsx` a `components/match-celebration.tsx` (dos fotos, «¡Es un match!», «Enviar mensaje» → `/chat/[id]`, «Seguir»), con `useReducedMotion` | Comunidad sigue igual (tests/Maestro `05-social`) | Maestro verde | TODO |
| H2.S5.M2 | `providers`: escuchar `match:new` en el socket de lista y disparar la celebración en cualquier pantalla (una vez por `connectionId`, cerrojo `tap-lock`) | B acepta → A ve la celebración donde esté | vídeo/capturas dos dispositivos | TODO |
| H2.S5.M3 | Hoja ⋯ del hilo: + Silenciar · Desemparejar (`connectionsService.remove` con confirm «Se cierra el chat para los dos») · Bloquear (`POST /me/blocks`) · Denunciar persona (`ReportSheet` `USER`) | tras desemparejar vuelve a Mensajes y el chat no está | test verde + prueba con dos cuentas | TODO |
| H2.S5.M4 | Silenciar (A-C2): local en `AsyncStorage` `chat.muted` → la fila muestra campana tachada y el badge global no la cuenta; notificaciones push **siguen llegando** y la UI lo dice | copy honesto visible | captura | TODO |

### H2.S6 — Pruebas, accesibilidad, evidencia

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H2.S6.M1 | Vitest nuevos: fila, carril, intro de hilo, typing, estado de entrega, optimista/fallo, hoja ⋯, celebración | 8 archivos | `vitest --config src/features/chat/vitest.config.mts` verde | TODO |
| H2.S6.M2 | Maestro `17-mensajes.yaml`: abrir desde badge, carril, buscar, entrar a chat vacío, tocar rompehielos, enviar, ver «Enviado», ⋯ → Ver perfil | pasa en simulador | salida en `evidencia/` | TODO |
| H2.S6.M3 | Dos dispositivos: A envía, B ve badge y fila en vivo, B lee, A ve «Visto»; B bloquea, A queda solo lectura | capturas por paso | `evidencia/h2-dos-dispositivos.md` | TODO |
| H2.S6.M4 | Accesibilidad: VoiceOver/TalkBack en lista e hilo; targets ≥ 44; contraste de línea de estado y de burbujas medido | checklist | `evidencia/a11y-mensajes.md` | TODO |
| H2.S6.M5 | Doble revisión visual por `visual-reviewer` | ≥ ACEPTABLE CON RESERVAS | `evidencia/doble-revision.md` | TODO |

## Riesgos propios de H2

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Segundo socket (lista) además del del hilo | doble conexión, tickets | un solo socket en `providers` con `join` por conversación; el hilo reutiliza el mismo (refactor acotado de `use-chat-socket.ts`) |
| Cambiar el test «cinco items» del compositor | parece debilitar | se actualiza a seis **con** aserción de cableado; se documenta en el commit |
| `unreadCount` con política de recibos desactivada | contar lo que no se puede marcar | `unreadCount` es del lector, independiente de recibos; `markRead` ya existe |
| Modal de celebración sobre otro modal (iOS) | se traga el modal | celebración como pantalla `presentation: 'transparentModal'` de expo-router, no `Modal` |
| GIF sin decisión | botón muerto | no se pinta hasta `DECISION_REQUIRED` resuelto |
