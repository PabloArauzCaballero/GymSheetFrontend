# H10.S3.M3 — exportación ICS en web y móvil (2026-10-12)

Web descarga `GET /me/training-invitations/:id/calendar.ics` mediante el BFF autenticado y solo ofrece el botón si existe `meeting`, incluida una reunión cancelada. Móvil hace la misma descarga con bearer en la cabecera, valida el ICS, comparte un archivo local mediante `expo-sharing` y borra ese archivo temporal al cerrar el diálogo; el token nunca forma parte del enlace o del archivo. Ambos clientes informan que la importación y eventual actualización dependen de la aplicación de calendario elegida.

Gates ejecutados con Node 22:

| Directorio | Comando | Resultado |
|---|---|---|
| `GymSheetFrontend/apps/web` | `corepack yarn vitest run src/features/training-invitations src/shared/server/backend-route-policy.test.ts` | 5 archivos y **97 pruebas PASS**; exit 0. |
| `GymSheetFrontend/apps/mobile` | `node --import ./scripts/register-ts-extension.mjs --test --experimental-strip-types src/features/training-invitations/training-invitations-service.test.ts` | **6/6 PASS**; exit 0. |
| `GymSheetFrontend/apps/mobile` | `node --import ./scripts/register-ts-extension.mjs --test --experimental-strip-types src/features/training-invitations/calendar-ics-contract.test.ts` | **2/2 PASS**; exit 0. |
| `GymSheetFrontend/apps/web` | `corepack yarn type-check` | `tsc --noEmit`, exit 0. |
| `GymSheetFrontend` | `corepack yarn workspace @gymsheet/mobile type-check` | `tsc --noEmit`, exit 0. |

El backend verificó HTTP ICS y UID en E2E PostgreSQL [aquí](backend-h10-s3-m3-calendar-2026-10-12.md). Se agregaron drivers fijos para iOS y web, comparación de UID y cuenta en el runner, y pruebas de contrato del extractor. La ejecución de drivers sigue pendiente: el preflight [actualizado](h10-s3-m3-pair-drivers-2026-10-12.md) terminó con exit 2 y `BLOCKED` por API no disponible y simulador iOS apagado; el manifiesto marca `secretsIncluded=false`. No se abrió una hoja de compartir nativa ni se importó el archivo en un calendario externo. H10.S3.M3 sigue EN CURSO hasta la verificación PAIR en dispositivos y la comprobación de reimportación en calendarios externos.
