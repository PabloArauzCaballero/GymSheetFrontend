const resourceId = '[A-Za-z0-9-]+';

const allowedPathPatterns = [
  /^\/access\/me$/u,
  /^\/access\/credentials\/me$/u,
  /^\/auth\/socket-ticket$/u,
  /^\/admin\/access\/devices$/u,
  new RegExp(`^/admin/access/devices/${resourceId}/status$`, 'u'),
  /^\/admin\/access\/history$/u,
  new RegExp(`^/admin/access/events/${resourceId}$`, 'u'),
  new RegExp(`^/admin/access/credentials/user/${resourceId}$`, 'u'),
  /^\/admin\/access\/credentials\/(pin|external-reference)$/u,
  new RegExp(`^/admin/access/credentials/${resourceId}/revoke$`, 'u'),
  /^\/admin\/equipment$/u,
  /^\/admin\/equipment\/catalog$/u,
  new RegExp(`^/admin/equipment/${resourceId}$`, 'u'),
  /^\/admin\/exercises\/global$/u,
  new RegExp(`^/admin/exercises/global/${resourceId}$`, 'u'),
  /^\/admin\/exercises\/import\/exercises-dataset$/u,
  /^\/admin\/facilities\/(branches|rooms|access-points|equipment-assignments|maintenance)$/u,
  new RegExp(`^/admin/facilities/(branches|rooms)/${resourceId}$`, 'u'),
  new RegExp(`^/admin/facilities/maintenance/${resourceId}/(start|complete)$`, 'u'),
  /^\/admin\/media$/u,
  /^\/admin\/membership\/(plans|customers|memberships|staff|staff-users)$/u,
  new RegExp(`^/admin/membership/plans/${resourceId}(/scopes)?$`, 'u'),
  new RegExp(`^/admin/membership/memberships/${resourceId}/status$`, 'u'),
  new RegExp(`^/admin/membership/staff/${resourceId}/status$`, 'u'),
  // El token de activación es base64url y no encaja en `resourceId`, que sólo
  // admite guiones: lleva además guiones bajos. Se acota igualmente el alfabeto
  // para que esta entrada no se convierta en un comodín hacia el backend.
  /^\/admin\/membership\/activation\/[A-Za-z0-9_-]{20,120}$/u,
  /^\/me\/membership\/activation-request$/u,
  /^\/admin\/membership\/insights\/(equipment-usage|people-flow|lapsed)$/u,
  /^\/admin\/membership\/users$/u,
  /^\/equipment$/u,
  new RegExp(`^/exercise-media/${resourceId}$`, 'u'),
  /^\/exercises$/u,
  /^\/exercises\/personal$/u,
  // Máquina que corresponde a un músculo, para el alta de ejercicio propio.
  /^\/exercises\/equipment-suggestion$/u,
  new RegExp(`^/exercises/${resourceId}(/media)?$`, 'u'),
  /^\/export\/workout-history(\/csv)?$/u,
  /^\/memberships\/me$/u,
  /^\/membership\/plans$/u,
  new RegExp(`^/membership/plans/${resourceId}$`, 'u'),
  /^\/me\/onboarding$/u,
  /^\/me\/onboarding\/(profile|goals|preferences|equipment|complete)$/u,
  /^\/me\/body-measurements$/u,
  /^\/me\/membership$/u,
  /^\/me\/membership\/(options|renewal-intent|extension-intent)$/u,
  /^\/me\/accesses$/u,
  // La senda: estado, confirmación de novedades y clasificación del gimnasio.
  /^\/me\/progression$/u,
  /^\/me\/progression\/(acknowledge|leaderboard|rest-days)$/u,
  /^\/me\/photos$/u,
  new RegExp(`^/me/photos/${resourceId}$`, 'u'),
  /^\/me\/tutorial-progress$/u,
  new RegExp(`^/me/tutorial-progress/${resourceId}$`, 'u'),
  // Punto 11 (conexiones), 10 (estado social) y 5 (directorio + chat).
  /^\/me\/connections$/u,
  new RegExp(`^/me/connections/${resourceId}$`, 'u'),
  /^\/me\/social-status$/u,
  /^\/me\/gym-directory$/u,
  // Ficha social de un socio concreto (directorio + insignias ganadas). Es lo
  // que abre la tarjeta de una interacción, y lo que registra la visita.
  new RegExp(`^/me/gym-directory/${resourceId}$`, 'u'),
  // Las sedes del gimnasio propio, no el directorio público de marcas: es lo
  // que debe alimentar el filtro por sucursal, porque `/me/gym-directory` está
  // acotado al tenant y filtrar por una sede ajena no puede devolver a nadie.
  /^\/me\/facilities\/branches$/u,
  /^\/me\/conversations$/u,
  new RegExp(`^/me/conversations/${resourceId}/messages$`, 'u'),
  // Chat completo, a la altura del móvil: media (multipart), la revelación de
  // un mensaje de vista única, el apodo privado de la conversación y el avance
  // del cursor de leído. Sin estas cuatro, el hilo de la web se queda en texto
  // plano contra un backend que ya sirve el resto.
  new RegExp(`^/me/conversations/${resourceId}/messages/media$`, 'u'),
  new RegExp(`^/me/conversations/${resourceId}/messages/${resourceId}/view$`, 'u'),
  new RegExp(`^/me/conversations/${resourceId}/nickname$`, 'u'),
  new RegExp(`^/me/conversations/${resourceId}/read$`, 'u'),
  // Descubrimiento (R6.1): la baraja, el swipe y el deshacer. `swipes/undo` va
  // en su propia entrada y no como sufijo opcional de `swipes` porque son dos
  // operaciones distintas: una decide, la otra revierte la última decisión.
  /^\/me\/discovery\/deck$/u,
  /^\/me\/discovery\/swipes$/u,
  /^\/me\/discovery\/swipes\/undo$/u,
  // Stories (R6.2). `/me/stories` es GET del propio + POST multipart; el feed
  // es una ruta hermana y no un parámetro, así que se declara aparte aunque el
  // patrón por identificador de abajo también la aceptaría: quien lea esta
  // lista debe ver qué rutas existen, no deducirlas.
  /^\/me\/stories$/u,
  /^\/me\/stories\/feed$/u,
  new RegExp(`^/me/stories/${resourceId}$`, 'u'),
  new RegExp(`^/me/stories/${resourceId}/(view|viewers)$`, 'u'),
  // Vistas de perfil (R6.3): lista paginada por cursor, resumen y la marca de
  // «ya la revisé».
  /^\/me\/profile-views$/u,
  /^\/me\/profile-views\/(summary|checked)$/u,
  // Interacciones (R6.3): las cuatro listas, los contadores de cabecera y el
  // borrado de un descarte propio para devolver a esa persona a la baraja.
  /^\/me\/interactions\/(likes-received|likes-sent|passes-received|passes-sent|counts)$/u,
  new RegExp(`^/me/interactions/passes/${resourceId}$`, 'u'),
  /^\/notifications\/me$/u,
  /^\/notifications\/preferences\/me$/u,
  new RegExp(`^/notifications/${resourceId}/read$`, 'u'),
  /^\/profile$/u,
  // Directorio público de sedes: el filtro de sucursal en Comunidad lo pide
  // desde el navegador ('use client'), a diferencia de las páginas públicas
  // (`/gimnasios`), que lo llaman servidor-a-servidor sin pasar por este BFF.
  /^\/public\/facilities\/branches$/u,
  // Catálogo anatómico: alimenta el selector de músculo del ejercicio propio.
  /^\/muscles$/u,
  /^\/muscle-groups$/u,
  /^\/routines$/u,
  /^\/routines\/import$/u,
  /^\/routines\/assignments\/(me|coach)$/u,
  new RegExp(`^/routines/exercises/${resourceId}$`, 'u'),
  new RegExp(`^/routines/${resourceId}$`, 'u'),
  new RegExp(`^/routines/${resourceId}/(exercises|assign|start)$`, 'u'),
  /^\/user-exercises$/u,
  new RegExp(`^/user-exercises/${resourceId}$`, 'u'),
  /^\/users\/me$/u,
  /^\/workouts$/u,
  new RegExp(`^/workouts/${resourceId}$`, 'u'),
  new RegExp(`^/workouts/${resourceId}/(finish|cancel|exercises)$`, 'u'),
  new RegExp(`^/workouts/session-exercises/${resourceId}(/sets)?$`, 'u'),
  new RegExp(`^/workouts/sets/${resourceId}$`, 'u'),
];

export function resolveAllowedBackendPath(parts: string[]) {
  if (parts.length === 0 || parts.length > 6) return null;
  if (
    parts.some(
      (part) => part.length === 0 || part.length > 200 || part === '..' || part.includes('\\'),
    )
  ) {
    return null;
  }
  const path = `/${parts.map(encodeURIComponent).join('/')}`;
  return allowedPathPatterns.some((pattern) => pattern.test(path)) ? path : null;
}
