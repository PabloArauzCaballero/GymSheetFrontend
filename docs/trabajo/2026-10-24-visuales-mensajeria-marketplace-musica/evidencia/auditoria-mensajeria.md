# Auditoría — mensajería móvil (2026-10-24, solo lectura)

Agente de solo lectura sobre `apps/mobile` (y vistazo a `apps/web/src/features/chat`). Rutas
relativas a `apps/mobile/`. Es insumo del plan; no cambia código.

## Navegación
- Cuatro pestañas (`app/(app)/(tabs)/_layout.tsx`): home, routines, comunidad, profile. No hay pestaña de mensajes. El badge de Comunidad cuenta likes + visitas (`_layout.tsx:196,292`, `src/components/interactions-counts.tsx:41`); los no leídos no se cuentan.
- Entradas: icono en la cabecera de Comunidad → `/comunidad-mensajes` (punto volt solo si hay solicitudes pendientes, `comunidad.tsx:570,1006-1036`); `NavRow` «Chat» en Perfil → `/chat` (`profile.tsx:251`); `chatService.startConversation` desde match modal, botón del deck, `interacciones.tsx:217`, `descubrir.tsx:590`, `perfil/[userId].tsx:120`, `top-gym-sheet.tsx:86`, Conexiones; respuesta a story con `storyReplyMessageId`.
- Pantallas: `chat/index.tsx` (60 l., lista «Chat»), `comunidad-mensajes.tsx` (409 l., hub con StoriesBar y segmentos General/Solicitudes/Conexiones), `chat/[id].tsx` (1546 l.), `chat/lugar.tsx`, `chat/reenviar.tsx`. Dos listas duplicadas.
- Params: `/chat/[id] {id, storyReplyMessageId?}`, `/chat/lugar {conversationId, replyToId?}`, `/chat/reenviar {fromConversationId, messageId}`. Atrás del hilo cae en `router.replace('/comunidad')`.

## Lista de conversaciones
- Fila `src/components/chat-conversation-row.tsx` sobre `NavRow`: avatar 52 (foto o iniciales en volt con `fontWeight '700'`), punto verde 14, badge de sistema 20, título, `lastMessage` o «Todavía sin mensajes.», hora. Falta: no leídos, «Tú:», tick, typing, glifo de media, silenciado.
- `ConversationSummary` sin `unreadCount` (`packages/schemas/src/definitions/social.ts:181-201`).
- `.map()` dentro de `Card`+`Divider` en `ScrollScreen`; sin virtualizar ni paginar; `GET /me/conversations` devuelve todo. Sin orden propio, sin buscador, sin acciones por deslizar, sin realtime (staleTime 30 s).
- Estados: skeleton 200, `ErrorState`, `EmptyState` sin CTA (web tiene «Ir a Comunidad»); pull-to-refresh solo en `chat/index.tsx`.
- Hub: `TabChip` activo en volt; Solicitudes con aceptar/rechazar; Conexiones con «Desconectar» (lo más parecido a desemparejar); modal «N personas visitaron tu perfil hoy» al entrar.

## Hilo
- Cabecera (`features/chat/chat-header.tsx`): atrás, avatar 38 con punto y badge de temporizador, nombre, estado («escribiendo…»/«en línea»/últ. vez); toque → `ContactInfoSheet`; botón «Entrenemos juntos»; ⋯ también abre la hoja. Sin avatar grande centrado.
- Hoja de contacto (`chat-sheets.tsx:237-392`): avatar 88, apodo, desaparecer 24h/7d/90d, recibos por chat, Entrenemos juntos, Ver perfil. Sin bloquear / denunciar persona / desemparejar / silenciar (bloqueo y denuncia en `perfil/[userId].tsx:134-146`).
- Burbujas (`message-bubble.tsx`): gramática WhatsApp (radio 18/6, cola SVG en la última del grupo, ancho 82 %), meta en línea (temporizador, «Editado», hora, ticks), «Reenviado», referencia a story, cita, píldora de reacciones; deslizar a la derecha para responder; long-press → hoja de acciones; animación solo para mensajes nuevos.
- Agrupación 10 min y separadores de día (`hooks/chat-timeline.ts`). Ticks de lectura `#34b7f1`. Typing solo texto de cabecera (ping 3 s, idle 4 s, expira 6 s).
- Reacciones: 6 rápidas + `rn-emoji-keyboard`; una por usuario; optimista con rollback. Acciones: responder, reenviar, copiar, editar (15 min), borrar (ME / EVERYONE 60 h), denunciar (cierra el chat para ambos). Encadenado de hojas con `afterActionsSheet` (iOS).
- Media (`message-content.tsx`): imagen 240×240 → visor sin zoom/deslizar/cerrar; video `expo-video`; audio barra 3 px sin forma de onda ni velocidad; ubicación tarjeta sin mapa; vista única; tombstone. Bearer desde `useMediaAccessToken`.
- Adjuntar (`chat-attach-menu.tsx`): emoji, foto, cámara, ubicación, vista única. Sin GIF/sticker/archivo. Preview de un solo medio.
- Compositor (`chat-composer.tsx`): «+», píldora multilínea (120), mic→enviar con texto; nota de voz mantener/deslizar/bloquear, 120 s.
- Sin burbuja optimista para texto (spinner), sin progreso de subida, sin cola offline.
- Solo lectura con banner; wallpaper SVG; scroll-to-latest con badge; salto a cita hasta 20 páginas; recuperación al volver del fondo; revocación/404 limpian todo.

## Datos
- REST bajo `/me/conversations` (listar, crear, mensajes `?limit&before&beforeId`, enviar texto/ubicación, media multipart, reacción, reenviar, desaparecer, ver vista única, apodo, leer, borrar, editar), `/me/chat/read-receipts`, `/auth/socket-ticket`. Moderación `/me/reports`, bloqueos `/me/blocks`, conexiones, swipes (undo 409 si hay mensajes), interacciones.
- Esquemas: `conversationSummarySchema`, `chatMessageSchema` (text/image/video/audio/location), `systemMessageSchema`, `readReceiptSettingsSchema`. Sin unread, matchedAt, sticker, mute, typing en el resumen. **El backend sí tiene stickers** (`gym.cheer.v1`, `gym.strong.v1`).
- Socket.IO `/chat` con ticket de un uso, un socket por hilo; eventos in: message:new/deleted/updated/reaction, typing:update, presence:update, message:delivered/read, read-receipts:changed, conversation:revoked; out: join/leave/send/typing. La lista no tiene realtime.
- Envío: socket con fallback REST; media espera la subida. Página 40 con `before`; móvil no manda `beforeId` (web sí). Dedupe por id; tombstones y caché de edición.

## Primitivas y tokens
- Usa `PressableScale`, `BottomSheet`, `NavRow`, `ScrollScreen`, `Card`, `Skeleton`, `EmptyState`, `ErrorState`, `Button`, `notify/confirm`, `StoriesBar`. **No usa** `PersonAvatar` (avatar reimplementado en 5 sitios), `IconButton` (uno local), `Text` de la casa.
- Números sueltos: avatares 52/38/44/88, punto 14, badge 20, burbuja 18/6, cola 8×13, ticks 15, botón 44, maxHeight 120, círculos 52, media 240; `fontWeight '700'/'800'`; `keyboardAppearance="dark"`; `colors.background` sobre volt en 6 sitios.

## Tests
- Pantalla (vitest + shim `rn-dom`): compositor, lugar, hilo (editar, desaparecer, ubicación, voz, responder, reacciones, separadores, reenviar, typing), nota de voz. Lógica: 10 hooks. Sin tests: lista, hub, modal de match, reenviar, cabecera sola, visor, borrar, denunciar, recibos UI.

## Web
- `/chat` hub con 3 pestañas y aviso inline; `ConversationRow` con `PersonAvatar`; sin voz, responder, reacciones interactivas, reenviar, borrar, desaparecer, typing saliente; lógica en hooks.

## Huecos vs Tinder (resumen)
1. Sin entrada ni badge de mensajes. 2. Sin carril de nuevos matches (falta contrato). 3. Fila sin no leídos/«Tú:»/glifo/acciones; sin buscador; sin virtualizar; sin realtime. 4. Cabecera WhatsApp, sin ⋯ con desemparejar/bloquear/denunciar. 5. Hilo vacío genérico, sin rompehielos. 6. Typing solo texto. 7. Recibos solo ticks. 8. Sin GIF/sticker/multifoto/pendiente/fallo/progreso. 9. Visor sin zoom, ubicación sin mapa, audio sin onda. 10. Match solo en Comunidad, sin realtime. 11. Primitivas duplicadas y números mágicos. 12. Tests faltantes.
