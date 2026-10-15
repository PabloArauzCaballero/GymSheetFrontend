# Especificación — experiencia social de GymSheet

Fuente de requisitos: [DECISIONES.md](DECISIONES.md). Planificación de alcance arquitectónico, descompuesta en entregas verticales. La especificación describe el comportamiento objetivo; no certifica el código actual.

## 1. Recorrido observable

Una persona termina su registro de entrenamiento. Puede elegir «Ahora no» y seguir entrenando. Si activa social, confirma fecha de nacimiento, nombre público, al menos una foto, descripción, intenciones y preferencias. Ve sus insignias/XP, aporta intereses y disponibilidad y puede conceder permisos contextuales. La activación termina en Conocer. Cerrar la app a mitad del proceso conserva borrador privado y retoma el paso pendiente.

Dos cuentas adultas de gimnasios diferentes se encuentran por tarjetas o zonas del mapa. A conecta con B; B ve la solicitud y acepta. El mismo estado se refleja al abrir un reel de B. Se habilitan chat, historias entre conexiones e invitaciones de entrenamiento. Todas las acciones persisten al cerrar y abrir las tres aplicaciones.

## 2. Perfil y permisos

- Campos públicos: ID social, nombre público, edad calculada, fotos ordenadas, bio, intenciones, intereses, disciplinas, nivel de experiencia declarado, disponibilidad opcional, insignias, XP, enlaces y gimnasio público opcional.
- Fecha de nacimiento, teléfono, email, membresía, asistencia, antropometría, medidas corporales y coordenadas privadas no pertenecen al DTO público. No inferir ni publicar orientación, salud u otros atributos a partir de fotos o nombres.
- 1–6 fotos, reutilizando el límite observado del backend; primera foto como portada, reordenamiento explícito. Bio propuesta: 1–500 caracteres visibles; nombre público 2–60; URL HTTPS de Instagram/Facebook validada por host, sin protocolos ejecutables. Límites nuevos son diseño técnico verificable.
- Preferencias: géneros buscados, rango de edad mínimo 18, distancia, gimnasio opcional, flags independientes de flexibilidad. Cambiar filtros invalida baraja, cursores y consultas de mapa obsoletas.
- Social `OFF → DRAFT → ACTIVE ↔ PAUSED`; suspensión de moderación prevalece. `PAUSED` conserva conversaciones/conexiones, pero se excluye de nuevos resultados, también mapa.
- Ubicación `DEVICE_APPROXIMATE | MANUAL_AREA`; el producto muestra cuando es aproximada. Revocar ubicación detiene actualizaciones; una ciudad elegida explícitamente sigue siendo válida. Aparecer en mapa es un consentimiento distinto, inicialmente desactivado.
- Contactos: permiso contextual, sincronización voluntaria, baja/revocación e identidad de contacto verificada. No invitar ni enviar mensajes automáticamente. Contactos no participantes no se muestran como perfiles sociales.

## 3. Conocer y conexión

- Baraja y lista alternativa accesible; acciones de aceptar/rechazar disponibles como botones además de gestos. Estados: carga, perfiles disponibles, sin resultados, filtros demasiado estrechos, servicio temporalmente no disponible.
- `NONE → PENDING → ACCEPTED`; rechazo/retirada terminan la solicitud. Dos solicitudes recíprocas concurrentes generan una sola conexión aceptada.
- Edad 18+, opt-in, bloqueo, suspensión y filtros obligatorios se validan en servidor. Motor devuelve candidatos, nunca concede acceso. No excluir únicamente por distinto tenant.
- No duplicar perfiles en la misma baraja/sesión. Un descarte persiste hasta deshacer/reiniciar con confirmación de alcance. Reiniciar descartes no borra bloqueos ni conexiones.
- Likes recibidos son solicitudes de conexión, no seguidores. Mostrar pendientes, vacíos, paginación y respuestas idempotentes.
- Desconectar revoca acceso mutuo al chat anterior, historias e invitaciones futuras. Bloquear además impide perfiles, contenidos e interacciones. Un usuario C que nunca participó no obtiene el chat por ID.

## 4. Mapa

Conocer ofrece tarjetas y mapa; no sustituye el inicio normal de entrenamiento. Mapa permite capas Personas/Gimnasios/Ambos, volver a mi zona, buscar ciudad y «Buscar en esta zona». Arrastrar no produce una consulta por cada pixel ni cambia la ubicación del perfil.

Personas se agrupan por celdas de zona estables, con precisión mínima propuesta de aproximadamente 2 km; agrupar más al alejarse, nunca refinar por debajo de esa celda al acercarse. El servidor devuelve centro de celda pública, nunca coordenada individual exacta. Evitar reconstrucción por múltiples bounding boxes: membresía de zona basada en celda, conteos aproximados cuando aplique y límites de consulta. Tocar una zona abre lista paginada de candidatos filtrados. Un opt-out elimina a la persona de nuevas respuestas y de clientes conectados.

Gimnasios tienen marcador y ficha: nombre, dirección, fuente, estado de registro en GymSheet y enlace de navegación. Una fuente externa no certifica afiliación ni membresía. Deduplicación por ID de fuente y enlace verificado a sede interna; cercanía/nombre similares solo proponen coincidencia. Zona sin cobertura no se presenta como ciudad sin gimnasios. Pantalla incluye alternativa en lista para accesibilidad y fallo del mapa.

## 5. Chat y revocación

- Chat social requiere conexión aceptada al listar, leer, enviar, unirse por socket, descargar media o procesar un mensaje encolado. Chats corporativos existentes siguen sus reglas separadas.
- Texto, foto, audio grabado y sticker de catálogo; cargadores con cancelar/reintentar, permisos rechazados y estados de red. Un mensaje usa clave idempotente para evitar duplicados al reintentar.
- Edición: solo autor, solo texto, `serverNow - createdAt <= 15 minutos`; no reinicia el plazo. Reloj del teléfono no decide. Eliminación global: autor y `<= 24 horas`; tombstone «Mensaje eliminado», adjunto inaccesible. Eliminación local: cursor/registro por participante, no afecta al otro.
- Recibos: enviado al persistir; entregado al confirmar recepción de cliente; leído por lectura efectiva autorizada. La lectura usada para contador interno de no leídos se separa del recibo público.
- Preferencia global de recibos con excepciones por conversación. Efectiva solo si ambos permiten. «Todas» establece nuevo default y borra excepciones previas. Cambios concurrentes usan versión y respuesta autoritativa.
- Mantener historial de intervalos de supresión o clasificación irreversible por mensaje: avanzar `lastReadAt` tras reactivar no puede revelar retroactivamente mensajes leídos durante la desactivación.
- Al romper conexión, transacción marca la conversación anterior revocada; listado, historial, media y socket dejan de servirla. Clientes limpian caché propia y muestran confirmación sin historial. Reconectar crea nuevo `connectionId`/`conversationId`; no rehabilita participantes anteriores.
- «Desaparecer» garantiza revocar acceso desde GymSheet; no promete borrar capturas o archivos que alguien ya descargó fuera de la app. Media privada requiere entrega autorizada; una URL pública permanente sería incompatible. Evidencia de un reporte existente tiene acceso administrativo separado y política de retención definida antes del despliegue.

## 6. Historias

Crear foto/video, duración de vida existente de 24 horas desde publicación, elegir audiencia `ALL_CONNECTIONS | SELECTED_CONNECTIONS`. Revalidar conexión y selección al abrir, ver, reaccionar y descargar. Nuevas conexiones solo acceden conforme a la audiencia vigente: para selección explícita no se agregan solas. Vistas idempotentes; lista de viewers visible solo al autor.

Emojis/respuestas crean mensajes en el chat vigente con `storyId` y referencia autorizada. Historia expirada o eliminada deja una referencia «Historia no disponible», nunca un enlace que evada la expiración. Reacción repetida al mismo evento no duplica mensajes. Desconectar/bloquear prevalece sobre enlace y audiencia guardada.

## 7. Reels

- `DRAFT → UPLOADING → PROCESSING → READY | FAILED`; `READY → HIDDEN | DELETED`. No publicar un archivo a medio procesar. Duración validada en servidor después del recorte: 90 s admitido, más de 90 s rechazado.
- Capturar/subir, previsualizar, recortar, elegir portada, descripción y publicar. El permiso de cámara/micrófono se solicita al grabar. Cerrar/interrumpir no crea un reel visible corrupto.
- Para ti ordena contenido fitness; Conexiones incluye originales y reposts de conexiones aceptadas. Los autores y los usuarios que repostean se filtran por bloqueo/suspensión. Perfil del autor y acción conectar coherentes con el resto.
- Guardar es privado. Repost único `(actorId,reelId)` reversible. Feed agrupa por `reelId`; muestra una atribución resumida y conserva el autor. Borrar original elimina acceso desde guardados/reposts; no genera copias huérfanas.
- Likes idempotentes; comentarios y respuestas de un nivel con paginación, editar/borrar propios según política de comentarios separada del plazo de mensajes. Autor puede retirar comentarios de su reel y cerrar nuevas participaciones; moderador central puede ocultar contenido.
- Un solo reproductor activo, pausa al perder foco/entrar en background, liberar recursos al salir, poster accesible y precarga acotada. No reproducir todos los videos fuera de pantalla.

## 8. Entrenar juntos

Invitación entre dos conexiones: fecha/hora UTC más zona IANA, duración, lugar público o gimnasio, `OWN_ROUTINES | SHARED_SESSION`, sesión de referencia y nota opcional. Validar acceso a la sesión elegida sin revelar la rutina completa privada. Compartir genera snapshot autorizado para la sesión, no reasigna el programa del invitado.

Estados `PENDING → ACCEPTED | DECLINED | EXPIRED | CANCELLED`; contrapropuesta produce nueva revisión pendiente, con horario previo conservado en auditoría. Aceptar una revisión vieja falla con conflicto recuperable. Aceptación crea dos entradas de agenda relacionadas y un evento de chat, una vez.

Cada participante inicia y completa su propio workout. Pesos, repeticiones y XP se calculan desde su actividad; terminar A no completa B. Cancelar un encuentro no borra sesiones ya realizadas. Exportar al calendario es opcional y de una sola dirección, con ID estable para evitar duplicados. Tras cambios se ofrece actualizar el evento exportado; no prometer sincronización bidireccional. Web descarga ICS cuando no dispone del calendario nativo.

## 9. Notificaciones y moderación

Avisos de solicitud, conexión, mensaje, reacción e invitación con deduplicación y enlace que vuelve a autorizar el destino. Bloquear/desconectar invalida entregas en espera. No mostrar en push texto privado si la preferencia de privacidad lo impide. Pruebas locales de navegación no acreditan entrega push real.

Reportar perfil, mensaje, historia, reel o comentario con motivo y referencia. Reutilizar moderación existente, agregando alcance central explícito: administradores de gimnasio no reciben acceso general a chats de otros tenants. Roles, auditoría de acceso y resolución, evidencia mínima protegida, retiro/restauración consistente entre feed, mapa y almacenamiento.

## 10. Condición de aceptación del conjunto

El recorrido A↔B se ejecuta con backend y base reales, A/B en gimnasios distintos, simultáneamente en iOS/Android, y se repite cruzado con web. C es control no conectado; D es control bloqueado; E es menor. Reiniciar clientes debe conservar datos válidos y revocar los inválidos. Cada CA tiene evidencia API/BD/UI según [CALIDAD_Y_DOD.md](CALIDAD_Y_DOD.md); errores se corrigen mediante [LOOP.md](LOOP.md).
