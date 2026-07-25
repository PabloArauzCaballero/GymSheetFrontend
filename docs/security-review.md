# Revisión de seguridad

Controles verificados: JWT HttpOnly, sin Web Storage, BFF allowlist, validación Zod,
origin check en mutaciones, roles en backend, ownership 404, rate limiting, CORS allowlist,
SSRF allowlist para fuentes externas, límites de cuerpo/respuesta y redacción de 5xx.

Riesgos: aprobar licencia externa antes de multimedia; proteger métricas con token/red;
rotar cualquier secreto histórico según el runbook backend. No se añadieron secretos.
