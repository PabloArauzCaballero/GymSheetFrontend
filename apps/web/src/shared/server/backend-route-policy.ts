const resourceId = '[A-Za-z0-9-]+';

const allowedPathPatterns = [
  /^\/access\/me$/u,
  /^\/access\/credentials\/me$/u,
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
  /^\/me\/progression\/(acknowledge|leaderboard)$/u,
  /^\/me\/tutorial-progress$/u,
  new RegExp(`^/me/tutorial-progress/${resourceId}$`, 'u'),
  /^\/notifications\/me$/u,
  /^\/notifications\/preferences\/me$/u,
  new RegExp(`^/notifications/${resourceId}/read$`, 'u'),
  /^\/profile$/u,
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
