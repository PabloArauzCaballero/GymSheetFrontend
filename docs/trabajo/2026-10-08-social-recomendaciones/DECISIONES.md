# Decisiones de producto — GymSheet social

Fecha: 2026-10-08. Fuente: conversación recuperada y respuestas de esta sesión. Este registro sustituye propuestas anteriores incompatibles. Estado: decisiones confirmadas; implementación pendiente.

## Requisitos confirmados

| ID | Decisión que debe conservar la implementación |
|---|---|
| R01 | Primero planificación full stack detallada, con hitos, subtareas, microtareas, criterios de aceptación, Definition of Done, `/loop` y evidencia documental. |
| R02 | Android, iOS y web forman parte del alcance. Dos usuarios con sesiones simultáneas en dos emuladores/simuladores, más recorridos cruzados con web. |
| R03 | Después del registro y configuración de entrenamiento se ofrece activar el perfil social o «Ahora no». La sección social es opcional y abre en «Conocer». |
| R04 | Toda la sección social es 18+. Un perfil no activado o incompleto no aparece en descubrimiento. |
| R05 | Nombre público, al menos una foto y descripción breve; se muestran fotos, información pública, insignias y XP de entrenamiento existentes. |
| R06 | Intenciones múltiples: entrenamiento, amistad, citas. Se pueden modificar posteriormente. |
| R07 | Comunidad entre gimnasios; ubicación y gimnasio son filtros. La comunidad no abre datos administrativos de otro gimnasio. |
| R08 | Preferencias hombres, mujeres o ambos. Lo elegido es obligatorio en recomendaciones de personas, incluso al explorar o ante escasez. |
| R09 | Edad y distancia se amplían solo cuando la persona activa expresamente flexibilidad para cada filtro. 18+ siempre obligatorio. No exigir coincidencia exacta de todos los filtros entre ambas personas. |
| R10 | Motor de recomendaciones en repositorio separado. Arranque sin historial a partir del perfil y conocimiento de afinidades probables; adaptación posterior a interacciones y exploración. |
| R11 | Rechazar excluye al perfil hasta deshacer la decisión o reiniciar explícitamente los descartes. |
| R12 | Conectar es una única acción compartida entre Conocer, perfil, mapa y autor de un reel. La conexión mutua habilita el chat. Se pueden ver solicitudes recibidas y aceptarlas. |
| R13 | «Entrenemos juntos» solo entre conexiones aceptadas. Cada uno con su rutina es la opción predeterminada; también se puede compartir una sesión, sin reemplazar el programa personal. |
| R14 | Invitación con fecha, hora, lugar y sesión; aceptar, rechazar o proponer otro horario. Agenda de ambos, reflejo en chat, pesos/repeticiones/progreso/XP individuales. |
| R15 | Lugares: gimnasios y espacios públicos. La invitación no concede membresía, acceso físico ni reserva. Agenda interna y exportación opcional al calendario del dispositivo. |
| R16 | Historias visibles a conexiones aceptadas; elegir todas o una selección por historia. Reacciones con emojis y respuestas de texto llegan al chat con referencia a la historia. |
| R17 | Chat con texto, fotos, stickers y audios instantáneos. |
| R18 | Editar texto propio hasta 15 minutos tras enviarlo, con etiqueta «Editado». Eliminar para mí en cualquier momento. Eliminar para ambos hasta 24 horas, con «Mensaje eliminado», también para archivos. |
| R19 | Visto configurable desde Ajustes y `⋮ → Confirmaciones de lectura`: esta conversación, seleccionar conversaciones o todas, incluidas nuevas. Una excepción individual prevalece hasta aplicar «Todas» nuevamente. |
| R20 | Visto recíproco por conversación: cualquiera lo desactiva y ninguno ve lecturas del otro. Enviado/Entregado siguen disponibles. Reactivar no revela lecturas realizadas durante la desactivación. Configuración sincronizada entre plataformas. |
| R21 | Desconectar o bloquear hace desaparecer el chat para ambos, también sus mensajes y archivos. Reconectar crea una conversación nueva sin recuperar la anterior. Se cancelan invitaciones pendientes y encuentros futuros entre ellos; permanece el entrenamiento ya realizado. |
| R22 | Bloquear impide verse en descubrimiento, perfiles y contenido social o enviarse solicitudes. Desbloquear no reconecta automáticamente. |
| R23 | Solo reels; sin publicaciones tradicionales ni seguidores. Reels tiene «Para ti» y «Conexiones». |
| R24 | Para ti recomienda videos; Conexiones muestra videos propios o reposteados por conexiones aceptadas. Repost atribuye al autor y a quien comparte; varias conexiones no duplican el mismo video. |
| R25 | Guardados privados; reposts visibles a conexiones y reversibles. Likes/comentarios se mantienen sobre el reel original. |
| R26 | Reels sobre entrenamiento y vida fitness: ejercicios, progreso, deporte y experiencias en el gimnasio. |
| R27 | Grabar o subir video, recortar, elegir portada y descripción. Máximo 90 segundos. |
| R28 | Comentarios, respuestas y likes. Autor puede cerrar comentarios y borrar comentarios de su reel; cada usuario controla los propios. |
| R29 | Redes externas: enlaces opcionales a Instagram/Facebook, sin vinculación OAuth en esta versión. |
| R30 | Si se deniega ubicación, elegir ciudad/zona manualmente y recibir resultados aproximados. |
| R31 | Contactos opcionales para encontrar conocidos que hayan activado su perfil social. |
| R32 | Pausar el perfil lo oculta de Conocer conservando conexiones, chats y encuentros acordados. |
| R33 | Administración central de GymSheet revisa reportes entre gimnasios, mediante bandeja y acciones de moderación. |
| R34 | Mapa obligatorio para explorar personas en una zona y puntos de gimnasios de la ciudad. Acceso desde Conocer; capas Personas/Gimnasios/Ambos. |
| R35 | Personas agrupadas por zonas aproximadas. Tocar una zona permite abrir perfiles; aparecer en el mapa requiere elección específica del usuario. No publicar posición individual exacta ni rastreo en vivo. |
| R36 | Gimnasios registrados y de un directorio externo; distinguir registrados, mantener ubicación real de establecimientos y procedencia de datos. |
| R37 | Mover el mapa a otra zona/ciudad y «Buscar en esta zona» explora allí sin cambiar la ubicación real del usuario. |

## Decisiones técnicas propuestas por el plan

Estas concretan ejecución, no son supuestas respuestas adicionales del usuario. Se revisan con contratos y pruebas; no cambian R01–R37.

- Mantener NestJS/Sequelize/PostgreSQL en backend y Expo/Next en frontend. Nuevo recomendador TypeScript con API interna versionada, almacén propio y eventos de proyección; sin lectura directa de tablas privadas del backend.
- Recomendador híbrido explicable primero: características declaradas, matriz de afinidad versionada, exploración determinista y señales de conducta acotadas. Sin LLM decidiendo elegibilidad ni prometer una probabilidad calibrada.
- Historias conservan duración existente de 24 horas; no se amplía el alcance a historias destacadas.
- Un nivel de respuestas en comentarios, paginados; se evita una conversación recursiva ilimitada.
- Invitación puntual con duración inicial de 60 minutos editable, zona horaria explícita y vencimiento al comenzar. No crear recurrencias en esta entrega.
- Publicación de reels y acceso al mapa de personas requieren perfil social activo 18+. Pausar detiene exposición a nuevas personas en todas las superficies de descubrimiento; conexiones conservan acceso autorizado.
- La fecha de nacimiento declarada sirve al control de edad; no se presenta como verificación documental de identidad. El cambio de fecha requiere auditoría y revalidación de elegibilidad.
- R09 se refiere al centro de búsqueda activo. En modo mapa el centro es la zona explorada, claramente indicado; no se simula que el usuario está allí.
- Los filtros demográficos de Conocer aplican a recomendaciones de personas y mapa, no se infiere que deban filtrar el tema de todos los videos de Para ti. La acción de conectar mantiene autorización común y bloqueos.
- Se solicita permiso solo al usar la función que lo necesita. Ubicación de personas se mantiene privada en servidor; los proveedores cartográficos reciben consultas de zona, nunca perfiles ni listas de contactos.
- El contacto puede habilitar ser encontrado por teléfono/email verificado; activar social por sí solo no publica esos identificadores. En web sin acceso compatible a la agenda se usa invitación/enlace o selección manual, sin afirmar que se leyó la libreta.

## Propuestas anteriores sustituidas

- No hay seguidores ni posts tradicionales.
- No hay chat social antes de conexión mutua.
- No se conserva chat de solo lectura después de desconectar/bloquear.
- No se exige edad/distancia estrictamente recíproca en todas las situaciones.
- No se limita la comunidad al gimnasio.
- No se limita el visto a una preferencia global.

## Dependencias que requieren evidencia durante ejecución

No quedan preguntas de producto abiertas de este cuestionario. Selección de proveedor de mapas/directorio, credenciales de mapas Android, identidad verificada para contactos, retención de evidencias de moderación y capacidad de emulación son gates técnicos/operativos asignados a tareas. No deben disfrazarse como integraciones terminadas.
