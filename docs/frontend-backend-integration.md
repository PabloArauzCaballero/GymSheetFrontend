# Integración frontend-backend

Flujo: componente → servicio por feature → `apiRequest` → BFF same-origin → backend →
mapper/DTO → Zod → React Query → vista. `BACKEND_API_URL` es solo servidor. Las cookies
son HttpOnly, las mutaciones validan origen y una allowlist impide proxy arbitrario.

Para validación integrada: levantar PostgreSQL/migraciones/backend en 3000, frontend en
3001 y ejecutar `yarn test:e2e`. En esta ejecución Docker Desktop no estuvo disponible.
