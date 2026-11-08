# Rutas que la web llama y el BFF rechaza (2026-11-08)

Auditoría: cada ruta literal de los servicios web y de `@gymsheet/api-client` pasada por
`resolveAllowedBackendPath` (`apps/web/src/shared/server/backend-route-policy.ts`). Las que salen aquí
responden «Ruta no permitida» en el navegador aunque el backend las tenga. Ya añadidas en esta
sesión: `/programs/active`, `/programs/strength/activate`, `/programs/:id/(stop|progress|next-loads|close)`
y `/notifications/me/unread-count`.

Pendientes de decidir (el allowlist es una defensa en profundidad: cada entrada debe revisarse contra
la autorización del backend antes de abrirla):

- Admin: `/admin/permissions/:id/:id`, `/admin/routines`, `/admin/routines/:id/(insights|official)`,
  `/admin/support/programs/:id/recompute-week`, `/admin/support/users/:id/training`
- Cardio: `/cardio-plans`, `/cardio-plans/:id`, `/programs/cardio/activate`
- Comentarios y valoraciones: `/comments/:id`, `/comments/:id/:id`, `/comments/:id/like`,
  `/comments/gifs`, `/ratings/:id/:id`
- Directorio: `/directory/payments/orders`, `/directory/payments/orders/:id/receipt`,
  `/directory/payments/orders/my-orders`, `/public/directory/entities/:id/(payment-config|plans)`
- Ejercicios y músculos: `/exercises/:id/like`, `/exercises/:id/muscles`, `/muscles/:id`,
  `/muscles/:id/exercises`, `/me/exercises/:id/preference`
- Social: `/me/blocks`, `/me/blocks/:id`, `/me/social-discovery-settings`,
  `/me/social-map/(areas|cities|gyms|location)`, `/me/social-map/cells/:id/people`
- Chat: `/me/chat/read-receipts`, `/me/conversations/:id/messages/:id`
- Progresión: `/me/progression/prizes`, `/me/progression/strikes/buy`
- Reels: `/me/reels/:id`, `/me/reels/:id/(comments|like|repost|save)`, `/me/reels/:id/comments/:id`,
  `/me/reels/saved`
- Rutinas: `/routine-shares/:id/(accept|decline)`, `/routines/:id/(copy|publish|schedule|shares|structure)`,
  `/routines/:id/shares/:id`

La lista se cortó a 60 entradas en la salida de la auditoría; puede haber alguna más.
