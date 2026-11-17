import { businessRoutePatterns } from './backend-route-policy-business';

export { isAnonymousBackendPath, isNoStoreBackendPath, isOrderUploadPath } from './backend-route-policy-business';

const resourceId = '[A-Za-z0-9-]+';
// Código de músculo del catálogo anatómico (`BICEPS_BRACHII`): mayúsculas y guion bajo.
const muscleCode = '[A-Z0-9_]+';
// UUID estricto: donde un id convive con rutas hermanas de palabra (`/me/reels/saved`).
const uuid = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
// Qué se comenta o valora (`contentKinds` en `@gymsheet/types`, enum cerrado).
const contentKind = 'ROUTINE|EXERCISE|DIRECTORY_ENTITY|DIRECTORY_PRODUCT';
// Qué se puede reportar/moderar (`ModerationTargetKind`, enum cerrado): una
// alternativa explícita en vez de un comodín — así una URL no puede colar un valor que el backend rechazaría
// de todos modos, pero sin llegar a intentarlo.
const moderationTargetKind =
  'STORY|PROFILE_PHOTO|CHAT_MESSAGE|USER|REEL|ROUTINE|EXERCISE|COMMENT|MUSIC_PLAYLIST|BUSINESS_LISTING|BUSINESS_PROFILE|PAYMENT_ORDER';

const allowedPathPatterns = [
  /^\/auth\/socket-ticket$/u,
  // Auditoría (H01 de docs/refactor-profesional): un solo endpoint para las
  // dos consolas (/admin/auditoria y /sistema/auditoria) — el alcance lo
  // resuelve `actor.tenantScope` en el backend, no la URL.
  /^\/admin\/audit$/u,
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
  // Moderación (H01): cola, un caso puntual y las tres acciones sobre él, más
  // el historial de un usuario. `targetKind` va acotado al enum cerrado.
  /^\/admin\/moderation\/queue$/u,
  new RegExp(`^/admin/moderation/cases/(?:${moderationTargetKind})/${resourceId}$`, 'u'),
  new RegExp(
    `^/admin/moderation/cases/(?:${moderationTargetKind})/${resourceId}/(claim|release|resolve)$`,
    'u',
  ),
  new RegExp(`^/admin/moderation/users/${resourceId}/history$`, 'u'),
  // The REPP moderation team (ADR-0018), managed by SYSTEM_ADMIN: list, assign, revoke.
  /^\/admin\/platform\/moderators$/u,
  new RegExp(`^/admin/platform/moderators/${uuid}$`, 'u'),
  // Gym catalog for «Elegir gimnasio» (SYSTEM_ADMIN only; franja 7a impersonation).
  /^\/admin\/tenants$/u,
  /^\/equipment$/u,
  new RegExp(`^/exercise-media/${resourceId}$`, 'u'),
  /^\/exercises$/u,
  /^\/exercises\/personal$/u,
  // Máquina que corresponde a un músculo, para el alta de ejercicio propio.
  /^\/exercises\/equipment-suggestion$/u,
  new RegExp(`^/exercises/${resourceId}(/media)?$`, 'u'),
  /^\/export\/workout-history(\/csv)?$/u,
  /^\/me\/onboarding$/u,
  /^\/me\/onboarding\/(profile|goals|preferences|equipment|complete|social)$/u,
  /^\/me\/body-measurements$/u,
  // La senda: estado, confirmación de novedades y clasificación del gimnasio.
  /^\/me\/progression$/u,
  /^\/me\/progression\/(acknowledge|leaderboard|rest-days|rules)$/u,
  /^\/me\/photos$/u,
  new RegExp(`^/me/photos/${resourceId}$`, 'u'),
  // Denunciar contenido (H01): el botón en perfil ajeno, chat y stories.
  /^\/me\/reports$/u,
  /^\/me\/tutorial-progress$/u,
  new RegExp(`^/me/tutorial-progress/${resourceId}$`, 'u'),
  // Punto 11 (conexiones), 10 (estado social) y 5 (directorio + chat).
  /^\/me\/connections$/u,
  new RegExp(`^/me/connections/${resourceId}$`, 'u'),
  // H10: listar, crear y responder a una revisión vigente.
  /^\/me\/training-invitations$/u,
  new RegExp(`^/me/training-invitations/${resourceId}/respond$`, 'u'),
  new RegExp(`^/me/training-invitations/${resourceId}/calendar\\.ics$`, 'u'),
  new RegExp(`^/me/training-invitations/${resourceId}/shared-session$`, 'u'),
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
  new RegExp(`^/me/conversations/${resourceId}/messages/${resourceId}/media$`, 'u'),
  new RegExp(`^/me/conversations/${resourceId}/nickname$`, 'u'),
  new RegExp(`^/me/conversations/${resourceId}/read$`, 'u'),
  // Descubrimiento (R6.1): la baraja, el swipe y el deshacer. `swipes/undo` va
  // en su propia entrada y no como sufijo opcional de `swipes` porque son dos
  // operaciones distintas: una decide, la otra revierte la última decisión.
  /^\/me\/discovery\/deck$/u,
  /^\/me\/discovery\/preferences$/u,
  /^\/me\/discovery\/impressions$/u,
  /^\/me\/discovery\/swipes$/u,
  /^\/me\/discovery\/swipes\/undo$/u,
  // Conocer profile: the Tinder-style answers, the interest catalog and what
  // still keeps someone out of the deck (`readiness`).
  /^\/me\/discovery\/readiness$/u,
  /^\/me\/social-profile$/u,
  /^\/social\/catalog\/interests$/u,
  // Stories (R6.2). `/me/stories` es GET del propio + POST multipart; el feed
  // es una ruta hermana y no un parámetro, así que se declara aparte aunque el
  // patrón por identificador de abajo también la aceptaría: quien lea esta
  // lista debe ver qué rutas existen, no deducirlas.
  /^\/me\/stories$/u,
  /^\/me\/stories\/feed$/u,
  new RegExp(`^/me/stories/${resourceId}$`, 'u'),
  new RegExp(`^/me/stories/${resourceId}/(view|viewers|replies)$`, 'u'),
  new RegExp(`^/me/stories/${resourceId}/media$`, 'u'),
  // Reels H9.M1/M2: first-page feed and multipart publication only.
  /^\/me\/reels$/u,
  /^\/me\/reels\/feed$/u,
  new RegExp(`^/me/reels/${resourceId}/media$`, 'u'),
  // Vistas de perfil (R6.3): lista paginada por cursor, resumen y la marca de
  // «ya la revisé».
  /^\/me\/profile-views$/u,
  /^\/me\/profile-views\/(summary|checked)$/u,
  // Interacciones (R6.3): las cuatro listas, los contadores de cabecera y el
  // borrado de un descarte propio para devolver a esa persona a la baraja.
  /^\/me\/interactions\/(likes-received|likes-sent|passes-received|passes-sent|counts)$/u,
  new RegExp(`^/me/interactions/passes/${resourceId}$`, 'u'),
  /^\/notifications\/me$/u,
  // Contador de la campana de Inicio, el mismo que usa el móvil.
  /^\/notifications\/me\/unread-count$/u,
  /^\/notifications\/preferences\/me$/u,
  // Push al navegador (F4): la configuración pública que necesita `PushManager`
  // (`applicationServerKey`) y el alta/baja de la suscripción. El móvil llamaba
  // a `device-tokens` directamente contra el backend; la web pasa por el BFF
  // como todo lo demás, y sin estas dos entradas no llegaba ni a intentarlo.
  /^\/notifications\/push\/web-config$/u,
  /^\/notifications\/device-tokens$/u,
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
  // Only the member's own assignments: coach assignment was removed in franja 7a.
  /^\/routines\/assignments\/me$/u,
  // Programas de fuerza (`@gymsheet/api-client` → `createProgramServices`):
  // «Hoy» de Inicio, la activación y las tarjetas de programa los usan, y sin
  // estas entradas el BFF los rechazaba con «Ruta no permitida».
  /^\/programs\/active$/u,
  /^\/programs\/strength\/activate$/u,
  new RegExp(`^/programs/${resourceId}/(stop|progress|next-loads|close)$`, 'u'),
  new RegExp(`^/routines/exercises/${resourceId}$`, 'u'),
  new RegExp(`^/routines/${resourceId}$`, 'u'),
  new RegExp(`^/routines/${resourceId}/(exercises|start)$`, 'u'),
  /^\/user-exercises$/u,
  new RegExp(`^/user-exercises/${resourceId}$`, 'u'),
  /^\/users\/me$/u,
  /^\/workouts$/u,
  new RegExp(`^/workouts/${resourceId}$`, 'u'),
  new RegExp(`^/workouts/${resourceId}/(finish|cancel|exercises)$`, 'u'),
  new RegExp(`^/workouts/session-exercises/${resourceId}(/sets)?$`, 'u'),
  new RegExp(`^/workouts/sets/${resourceId}$`, 'u'),
  // Directorio multientidad y reseñas estilo App Store:
  /^\/public\/directory\/categories$/u,
  /^\/public\/directory\/entities$/u,
  new RegExp(`^/public/directory/entities/${resourceId}$`, 'u'),
  new RegExp(`^/public/directory/entities/${resourceId}/reviews$`, 'u'),
  /^\/directory\/entities$/u,
  new RegExp(`^/directory/entities/${resourceId}/reviews$`, 'u'),
  new RegExp(`^/directory/reviews/${resourceId}$`, 'u'),
  new RegExp(`^/directory/reviews/${resourceId}/helpful$`, 'u'),
  new RegExp(`^/directory/reviews/${resourceId}/reply$`, 'u'),
  // ── Rutas que la web ya llamaba y el BFF rechazaba (auditoría 2026-11-09). ──
  // Cada una existe en el backend (`GymSheetBackend`, rama `dev`, controlador
  // indicado) y lo autoriza ahí: este allowlist es defensa en profundidad.
  // Administración (SYSTEM_ADMIN en el backend desde la franja 7a).
  /^\/admin\/routines$/u,
  new RegExp(`^/admin/routines/${resourceId}/(insights|official)$`, 'u'),
  new RegExp(`^/admin/support/programs/${resourceId}/recompute-week$`, 'u'),
  new RegExp(`^/admin/support/users/${resourceId}/training$`, 'u'),
  // Cardio (`cardio-plans`, `programs/cardio/activate`).
  /^\/cardio-plans$/u,
  new RegExp(`^/cardio-plans/${resourceId}$`, 'u'),
  /^\/programs\/cardio\/activate$/u,
  // Comentarios y valoraciones de contenido.
  /^\/comments\/gifs$/u,
  new RegExp(`^/comments/${uuid}(/like)?$`, 'u'),
  new RegExp(`^/comments/(${contentKind})/${resourceId}$`, 'u'),
  new RegExp(`^/ratings/(${contentKind})/${resourceId}$`, 'u'),
  // Marketplace: the public plans of a listing (orders and payment data: backend-route-policy-business).
  new RegExp(`^/public/directory/entities/${resourceId}/plans$`, 'u'),
  /^\/public\/directory\/plans$/u,
  // Ejercicios y anatomía.
  new RegExp(`^/exercises/${resourceId}/(like|muscles)$`, 'u'),
  new RegExp(`^/me/exercises/${resourceId}/preference$`, 'u'),
  new RegExp(`^/muscles/${muscleCode}(/exercises)?$`, 'u'),
  // Privacy and account rights (franja 4): consents per closed kind, rename,
  // closure preview/PIN/close, email change and the full data export.
  /^\/me\/consents$/u,
  /^\/me\/consents\/(HEALTH|ORIENTATION|VERIFICATION_SELFIE|PRECISE_LOCATION)$/u,
  /^\/me\/account$/u,
  /^\/me\/account\/(closure-preview|closure-pin)$/u,
  /^\/me\/email\/change(\/confirm)?$/u,
  /^\/me\/export$/u,
  // The latest request (resumes a pending or ready copy after a reload).
  /^\/me\/export\/latest$/u,
  new RegExp(`^/me/export/${uuid}(/download)?$`, 'u'),
  // Person verification (franja 6): own status, challenge and selfie upload;
  // the staff queue, its signed selfie link and the decision.
  /^\/me\/verification(\/challenge)?$/u,
  new RegExp(`^/me/verification/${uuid}/selfie$`, 'u'),
  /^\/admin\/verifications$/u,
  new RegExp(`^/admin/verifications/${uuid}/(selfie|decide)$`, 'u'),
  // The platform account search (backend ADR-0026 §11); the staff closure left with 7d (ADR-0029).
  /^\/admin\/users$/u,
  // Social: bloqueos, descubrimiento, mapa y confirmaciones de lectura.
  /^\/me\/blocks$/u,
  new RegExp(`^/me/blocks/${resourceId}$`, 'u'),
  /^\/me\/social-discovery-settings$/u,
  /^\/me\/social-map\/(areas|cities|gyms|location)$/u,
  new RegExp(`^/me/social-map/cells/${resourceId}/people$`, 'u'),
  /^\/me\/chat\/read-receipts$/u,
  new RegExp(`^/me/conversations/${resourceId}/messages/${resourceId}$`, 'u'),
  // Progresión: premios y compra de strikes.
  /^\/me\/progression\/(prizes|strikes\/buy)$/u,
  // Reels: guardados, borrar, me gusta, repost, guardar y comentarios.
  /^\/me\/reels\/saved$/u,
  new RegExp(`^/me/reels/${uuid}(/(like|repost|save|comments))?$`, 'u'),
  new RegExp(`^/me/reels/${uuid}/comments/${resourceId}$`, 'u'),
  // Rutinas: compartir, copiar, publicar, calendario, semanas y estructura.
  /^\/me\/routine-invitations$/u,
  new RegExp(`^/routine-shares/${resourceId}/(accept|decline)$`, 'u'),
  new RegExp(`^/routines/${resourceId}/(copy|publish|unpublish|schedule|shares|structure|sync-from-source|calendar)$`, 'u'),
  new RegExp(`^/routines/${resourceId}/(shares|weeks)/${resourceId}$`, 'u'),
  new RegExp(`^/workouts/${resourceId}/apply-to-routine$`, 'u'),
  ...businessRoutePatterns,
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
