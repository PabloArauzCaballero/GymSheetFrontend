# Observabilidad

Backend: request ID saneado, logs estructurados, filtro global seguro, métricas Prometheus
acotadas y `/health/live`, `/health/ready`, `/health/metrics`. No registra payloads,
tokens ni cookies. Frontend: `error.tsx`, `global-error.tsx`, paneles recuperables,
normalización de errores API y estados loading/empty/error. No se añadió proveedor externo.

La ruta frontend `/api/health` verifica el proceso web. La readiness real pertenece al backend.
