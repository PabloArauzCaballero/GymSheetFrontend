# Rutas del BFF habilitadas (2026-11-09)

Auditoría: cada ruta literal de los servicios web y de `@gymsheet/api-client` pasada por
`resolveAllowedBackendPath` (`apps/web/src/shared/server/backend-route-policy.ts`).

**Resultado: 55 rutas que la web llamaba y el BFF rechazaba («Ruta no permitida») quedan
habilitadas.** Criterio por ruta:

1. La web la llama (servicio en `apps/web/src/features/*/services` o `@gymsheet/api-client`).
2. Existe en el backend: verificada contra los controladores de `GymSheetBackend` rama `dev`
   (`57f6f58`), que es quien autoriza (roles, propiedad, `UuidParamPipe`).
3. Patrón lo más estrecho posible: enums cerrados para tipos de contenido
   (`ROUTINE|EXERCISE|DIRECTORY_ENTITY|DIRECTORY_PRODUCT`), formato de código de músculo
   (`[A-Z0-9_]+`) y UUID estricto donde un id convive con rutas hermanas de palabra
   (`/me/reels/saved`, `/comments/gifs`).

Grupos habilitados: administración (rutinas REPP, soporte de entrenamiento), cardio, comentarios
y valoraciones, pedidos y planes del Marketplace, ejercicios y anatomía, bloqueos, ajustes de
descubrimiento, mapa social, confirmaciones de lectura, editar/borrar mensajes, premios y strikes,
reels (guardados, me gusta, repost, guardar, comentarios) y rutinas (compartir, copiar,
publicar, calendario, semanas, estructura, sincronizar, aplicar sesión).

Decisión revisada: `/me/reels/:id/comments` estaba bloqueada a propósito «hasta acordar más
endpoints»; el backend ya los tiene (GET/POST/PATCH) y la web los usa, así que se permite.

Las 8 entradas que la auditoría sigue listando son artefactos del script (rutas montadas con
`${...}` para la query o la clave de permiso codificada dos veces) y se comprobaron a mano: todas
pasan. Pruebas en `backend-route-policy.test.ts` (casos permitidos y bloqueados por grupo).
