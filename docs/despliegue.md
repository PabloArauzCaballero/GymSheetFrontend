# Despliegue en Coolify

Calco del patrón de los repos de Atlas: mismo VPS, mismo panel. Este documento es la lista de lo
que falta para que `git push origin dev` despliegue solo, no una confirmación de que ya está hecho.

Archivos ya en el repo:

- `docker-compose.coolify.yml` — cómo construye y levanta Coolify este frontend, en la red
  `coolify`, sin `ports:` ni `env_file:`.
- `.github/workflows/deploy-dev.yml` — dispara el webhook de Coolify en cada push a `dev` y espera
  el veredicto real del despliegue.

## Diferencia importante con el patrón de Atlas

En AtlasDashboards el navegador solo habla con el portal (base relativa `/api/v1` + rewrite de
Next), así que el backend nunca necesita dominio público. Aquí **no**: el chat abre un socket
directo desde el navegador contra `NEXT_PUBLIC_BACKEND_ORIGIN`
(`apps/web/src/features/chat/hooks/use-chat-socket.ts`), así que ese valor tiene que ser un origen
**público** del backend, no el alias interno `gymsheet-backend:3000` de la red `coolify`. Hasta que
exista ese dominio, el build usa el placeholder `http://localhost:3000` del compose y el chat no
funcionará contra el despliegue.

## Lo que falta hacer a mano en Coolify (una vez)

1. Crear la aplicación en el mismo proyecto de Coolify (`http://100.101.207.88:8000`), tipo
   *Docker Compose*, apuntando a este repo, rama `dev`, archivo `docker-compose.coolify.yml`.
2. Generar un segundo par de deploy key SSH (distinto al del backend — GitHub no admite la misma
   llave en dos repos), registrar la privada en Coolify y añadir la pública como *deploy key* de
   solo lectura en `GymSheetFrontend`.
3. Cuando exista el dominio público del backend, actualizar en la interfaz de la aplicación el
   build arg `NEXT_PUBLIC_BACKEND_ORIGIN` con ese origen (y redeploy — es build-time, no runtime).
4. Si el frontend en sí necesita dominio público (para abrirse desde un navegador normal),
   configurarlo en Coolify → Domains de la aplicación.
5. Activar **Connect To Predefined Network** en la aplicación (red `coolify`).
6. Copiar el **Deploy Webhook** de la aplicación y guardarlo como secret de GitHub.

## Secrets de GitHub Actions (Settings → Secrets and variables → Actions)

| Secret                              | Valor                                                          |
| ------------------------------------ | ----------------------------------------------------------------- |
| `GYMSHEET_TAILSCALE_AUTHKEY`         | Authkey efímera de Tailscale (misma que en GymSheetBackend vale)  |
| `GYMSHEET_COOLIFY_TOKEN`             | API token de Coolify con permisos `deploy` + `read`                |
| `GYMSHEET_FRONTEND_COOLIFY_WEBHOOK`  | Deploy webhook de esta aplicación en Coolify (lleva el UUID)        |

`GYMSHEET_TAILSCALE_AUTHKEY` y `GYMSHEET_COOLIFY_TOKEN` pueden ser el mismo valor que en
`GymSheetBackend` (una authkey de Tailscale no es exclusiva de un repo, y el token de Coolify vale
para todos los recursos del servidor sobre los que tenga permiso). El webhook sí es distinto: cada
aplicación tiene el suyo.

## Lo que sigue pendiente tras el primer despliegue

- El dominio público del backend (bloquea el chat en vivo, arriba).
- El dominio público del frontend, si debe verse desde fuera de la tailnet.
