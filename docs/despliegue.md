# Despliegue en Coolify

Calco del patrón de los repos de Atlas: mismo VPS, mismo panel.

**Estado: el primer despliegue automático ya salió verde.** El 12/09/2026 a las 03:02 UTC Coolify
terminó el despliegue del commit `32220be` lanzado por `git push origin dev`
([run 34667567679](https://github.com/PabloArauzCaballero/GymSheetFrontend/actions/runs/34667567679)).
El apartado con los pasos manuales queda como referencia de lo que hubo que configurar una vez; no
hay que repetirlo.

Archivos ya en el repo:

- `docker-compose.coolify.yml` — cómo construye y levanta Coolify este frontend, en la red
  `coolify`, sin `ports:` ni `env_file:`.
- `.github/workflows/deploy-dev.yml` — dispara el webhook de Coolify en cada push a `dev` y espera
  el veredicto real del despliegue.

## Diferencia importante con el patrón de Atlas

En AtlasDashboards el navegador solo habla con el portal (base relativa `/api/v1` + rewrite de
Next), así que el backend nunca necesita dominio público. Aquí **no**: el chat abre un socket
directo desde el navegador contra el backend
(`apps/web/src/features/chat/hooks/use-chat-socket.ts`), y un route handler de Next no puede
proxiarlo porque no hace upgrade de WebSocket. Ese origen tiene que ser **público**, no el alias
interno `gymsheet-backend:3000` de la red `coolify`, que el navegador del usuario no ve.

**Esa dirección ya no se hornea en el build.** Se lee en cada petición de la variable de entorno
`BACKEND_PUBLIC_ORIGIN` y viaja al cliente como propiedad desde el servidor, así que ponerla o
cambiarla es editar una variable en Coolify y reiniciar — no reconstruir la imagen. Si no está
definida, o si lo que hay no es una dirección http(s) válida (por ejemplo el alias interno, que
`new URL` acepta como esquema propio y cuyo origen es la cadena «null»), se usa como respaldo el
valor horneado y la pantalla de chat sigue cargando; lo único que no funciona es la conexión en
vivo. Ver `apps/web/src/shared/config/backend-origin.ts`.

## Lo que falta hacer a mano en Coolify (una vez)

1. Crear la aplicación en el mismo proyecto de Coolify (`http://100.101.207.88:8000`), tipo
   *Docker Compose*, apuntando a este repo, rama `dev`, archivo `docker-compose.coolify.yml`.
2. Generar un segundo par de deploy key SSH (distinto al del backend — GitHub no admite la misma
   llave en dos repos), registrar la privada en Coolify y añadir la pública como *deploy key* de
   solo lectura en `GymSheetFrontend`.
3. Cuando exista el dominio público del backend, poner ese origen en la variable
   `BACKEND_PUBLIC_ORIGIN` de la aplicación en Coolify y reiniciar. Es runtime: **no** hace falta
   reconstruir.
4. Si el frontend en sí necesita dominio público (para abrirse desde un navegador normal),
   configurarlo en Coolify → Domains de la aplicación.
5. Activar **Connect To Predefined Network** en la aplicación (red `coolify`).
6. Copiar el **Deploy Webhook** de la aplicación y guardarlo como secret de GitHub.

## Secrets de GitHub Actions (Settings → Secrets and variables → Actions)

| Secret                              | Valor                                                          |
| ------------------------------------ | ----------------------------------------------------------------- |
| `PABLO_H310_TAILSCALE_AUTHKEY`         | Authkey efímera de Tailscale (misma que en GymSheetBackend vale)  |
| `PABLO_H310_COOLIFY_TOKEN`             | API token de Coolify con permisos `deploy` + `read`                |
| `PABLO_H310_COOLIFY_WEBHOOK`  | Deploy webhook de esta aplicación en Coolify (lleva el UUID)        |

`PABLO_H310_TAILSCALE_AUTHKEY` y `PABLO_H310_COOLIFY_TOKEN` pueden ser el mismo valor que en
`GymSheetBackend` (una authkey de Tailscale no es exclusiva de un repo, y el token de Coolify vale
para todos los recursos del servidor sobre los que tenga permiso). El webhook sí es distinto: cada
aplicación tiene el suyo.

## Lo que sigue pendiente y no depende del código

- El dominio público del backend (bloquea el chat en vivo, arriba). Cuando exista: variable
  `BACKEND_PUBLIC_ORIGIN` y reinicio.
- El dominio público del frontend, si debe verse desde fuera de la tailnet. Cuando exista, conviene
  actualizar también `APP_URL` (la usan `robots.txt` y `sitemap.xml`, hoy en `http://localhost:3001`).

## Compilaciones móviles (EAS)

`apps/mobile/eas.json` ya no apunta a ningún túnel: los tres perfiles llevan el marcador
`https://CAMBIAR-POR-LA-URL-PUBLICA-DEL-BACKEND/api/v1`, y un guardián
(`apps/mobile/scripts/check-api-url.mjs`, enganchado a `eas-build-pre-install`) **aborta la
compilación** si esa dirección falta, sigue siendo el marcador, apunta a localhost o no responde.

Existe por un fallo que ya ocurrió: el perfil apuntaba a un túnel efímero de Cloudflare, el túnel
caducó, el build siguió saliendo verde y la aplicación instalada fallaba con un error de red
genérico. La dirección se hornea en el binario, así que el único momento barato para detectar el
error es antes de compilar.
