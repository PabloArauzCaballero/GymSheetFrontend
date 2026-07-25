# Runbook de prueba beta local

Estado verificado el 21 de julio de 2026. Este runbook prepara una beta local para
usuarios de prueba; las credenciales no deben reutilizarse en producción.

## Arranque

Requisito: Node.js 22 y Yarn 1.22.22.

```powershell
cd C:\Users\DELL\Documents\GitHub\GymSheetBackend
docker compose up -d
docker compose ps

cd C:\Users\DELL\Documents\GitHub\GymSheetFrontend
yarn install --frozen-lockfile
yarn dev --port 3001
```

Abrir `http://localhost:3001/login`. El API escucha en `http://localhost:3000`.

## Credenciales locales

| Rol | Correo | Contraseña | Resultado esperado |
| --- | --- | --- | --- |
| Administrador | `admin.dev@gymsheet.local` | `GymSheet-Admin_2026!` | Acceso administrativo |
| Coach | `coach.mock@gymsheet.local` | `GymSheet-Demo_2026!` | Acceso de coach |
| Atleta | `athlete.mock@gymsheet.local` | `GymSheet-Demo_2026!` | Panel e historial |
| Inactivo | `inactive.mock@gymsheet.local` | `GymSheet-Demo_2026!` | Rechazo 401 intencional |

La cuenta atleta incluye una sesión finalizada con un ejercicio y tres series. El
catálogo contiene 1.324 ejercicios estructurados; la importación de medios está
desactivada porque su licencia requiere confirmación separada.

## Comprobación rápida

```powershell
Invoke-RestMethod http://localhost:3000/api/v1/health/live
Invoke-RestMethod http://localhost:3000/api/v1/health/ready

cd C:\Users\DELL\Documents\GitHub\GymSheetFrontend
yarn test:e2e
```

El resultado esperado es `ok` en ambos endpoints y 8 pruebas Playwright aprobadas.

## Recuperación segura

- Reiniciar servicios: `docker compose restart` desde el backend.
- Revisar estado: `docker compose ps`.
- Revisar eventos recientes: `docker compose logs --tail 100 api worker-access worker-reminders worker-notifications`.
- Detener sin borrar datos: `docker compose down`.

No usar `docker compose down -v` durante la beta: eliminaría el volumen de datos.
Antes de una exposición pública deben rotarse JWT, contraseñas, claves de base de
datos y cualquier secreto de integración.
