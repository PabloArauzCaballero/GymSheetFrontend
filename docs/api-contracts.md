# Contratos API

El prefijo por defecto es `/api/v1`. El frontend valida respuestas con Zod y usa servicios
por feature. Autenticación, perfil, ejercicios, multimedia, workouts, membresías, acceso,
notificaciones e administración pasan por el BFF. Los errores normalizados conservan
status y request/correlation ID cuando el backend lo entrega.

Fuente canónica: `GymSheetBackend/docs/endpoints/openapi.yaml` y
`openapi-observability.yaml`. Existe una brecha documentada para controladores operativos
que aún no están en el OpenAPI principal.
