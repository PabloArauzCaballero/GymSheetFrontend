# Gestión de multimedia

Las referencias viven en `training.exercise_media` con proveedor, external ID, URL,
thumbnail, MIME, alt text, licencia, atribución, orden, estado y metadatos. El backend
valida URLs externas; el frontend recibe contenido por API y reserva dimensiones estables.
La importación hace upsert por identidad externa. Gym Visual no debe habilitarse hasta
confirmar términos. Las vistas muestran fallback semántico cuando no hay media.
