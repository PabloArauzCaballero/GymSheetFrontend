import { describe, expect, it } from 'vitest';
import { resolveAllowedBackendPath } from './backend-route-policy';

const id = '0190e2cb-a6d4-7ec3-8f91-a6c735631501';
const allowedCases: Array<[string[], string]> = [
  [['exercises'], '/exercises'],
  [['workouts', id, 'finish'], `/workouts/${id}/finish`],
  [
    ['admin', 'facilities', 'maintenance', id, 'complete'],
    `/admin/facilities/maintenance/${id}/complete`,
  ],
  [['notifications', 'preferences', 'me'], '/notifications/preferences/me'],
  [['admin', 'media'], '/admin/media'],
  [['admin', 'membership', 'staff-users'], '/admin/membership/staff-users'],
  [['admin', 'membership', 'staff'], '/admin/membership/staff'],
  [['me', 'progression'], '/me/progression'],
  [['me', 'progression', 'leaderboard'], '/me/progression/leaderboard'],
  [['me', 'progression', 'acknowledge'], '/me/progression/acknowledge'],
  [['me', 'progression', 'rules'], '/me/progression/rules'],
  [['exercises', 'equipment-suggestion'], '/exercises/equipment-suggestion'],
  [['muscles'], '/muscles'],
  [['muscles', 'PECTORALIS_MAJOR'], '/muscles/PECTORALIS_MAJOR'],
  [['muscles', 'DELTOID_ANTERIOR', 'exercises'], '/muscles/DELTOID_ANTERIOR/exercises'],
  [['exercises', id, 'muscles'], `/exercises/${id}/muscles`],
  [['exercises', 'taxonomy'], '/exercises/taxonomy'],
  [['routines', id, 'schedule'], `/routines/${id}/schedule`],
  [['auth', 'socket-ticket'], '/auth/socket-ticket'],
  [['me', 'connections'], '/me/connections'],
  [['me', 'connections', id], `/me/connections/${id}`],
  [['me', 'social-status'], '/me/social-status'],
  [['me', 'gym-directory'], '/me/gym-directory'],
  [['me', 'conversations'], '/me/conversations'],
  [['me', 'conversations', id, 'messages'], `/me/conversations/${id}/messages`],
  [['public', 'facilities', 'branches'], '/public/facilities/branches'],
  // R6: descubrimiento, stories, vistas de perfil e interacciones.
  [['me', 'gym-directory', id], `/me/gym-directory/${id}`],
  // Las sedes del gimnasio propio: es la que alimenta el filtro por sucursal.
  [['me', 'facilities', 'branches'], '/me/facilities/branches'],
  [['me', 'discovery', 'deck'], '/me/discovery/deck'],
  [['me', 'discovery', 'swipes'], '/me/discovery/swipes'],
  [['me', 'discovery', 'swipes', 'undo'], '/me/discovery/swipes/undo'],
  [['me', 'stories'], '/me/stories'],
  [['me', 'stories', 'feed'], '/me/stories/feed'],
  [['me', 'stories', id], `/me/stories/${id}`],
  [['me', 'stories', id, 'view'], `/me/stories/${id}/view`],
  [['me', 'stories', id, 'viewers'], `/me/stories/${id}/viewers`],
  [['me', 'profile-views'], '/me/profile-views'],
  [['me', 'profile-views', 'summary'], '/me/profile-views/summary'],
  [['me', 'profile-views', 'checked'], '/me/profile-views/checked'],
  [['me', 'interactions', 'likes-received'], '/me/interactions/likes-received'],
  [['me', 'interactions', 'likes-sent'], '/me/interactions/likes-sent'],
  [['me', 'interactions', 'passes-received'], '/me/interactions/passes-received'],
  [['me', 'interactions', 'passes-sent'], '/me/interactions/passes-sent'],
  [['me', 'interactions', 'counts'], '/me/interactions/counts'],
  [['me', 'interactions', 'passes', id], `/me/interactions/passes/${id}`],
  // F4: push web. Sin estas dos el navegador no puede ni preguntar si hay push.
  [['notifications', 'push', 'web-config'], '/notifications/push/web-config'],
  [['notifications', 'device-tokens'], '/notifications/device-tokens'],
  // H01 (docs/refactor-profesional/trabajo/HALLAZGOS.md): auditoría, permisos,
  // moderación y reportar contenido nunca habían llegado a este allowlist.
  [['admin', 'audit'], '/admin/audit'],
  [['admin', 'permissions', 'me'], '/admin/permissions/me'],
  [['admin', 'permissions', 'catalog'], '/admin/permissions/catalog'],
  [['admin', 'permissions', id], `/admin/permissions/${id}`],
  [
    ['admin', 'permissions', id, 'admin-access:manage'],
    `/admin/permissions/${id}/admin-access%3Amanage`,
  ],
  [['admin', 'moderation', 'queue'], '/admin/moderation/queue'],
  [
    ['admin', 'moderation', 'cases', 'CHAT_MESSAGE', id],
    `/admin/moderation/cases/CHAT_MESSAGE/${id}`,
  ],
  [
    ['admin', 'moderation', 'cases', 'CHAT_MESSAGE', id, 'claim'],
    `/admin/moderation/cases/CHAT_MESSAGE/${id}/claim`,
  ],
  [
    ['admin', 'moderation', 'cases', 'CHAT_MESSAGE', id, 'resolve'],
    `/admin/moderation/cases/CHAT_MESSAGE/${id}/resolve`,
  ],
  [['admin', 'moderation', 'users', id, 'history'], `/admin/moderation/users/${id}/history`],
  [['me', 'reports'], '/me/reports'],
  // Rutinas REPP F1: estructura por días, calendario, semanas, me gusta y favorito.
  [['routines', id, 'calendar'], `/routines/${id}/calendar`],
  [['routines', id, 'structure'], `/routines/${id}/structure`],
  [['routines', id, 'weeks', '6'], `/routines/${id}/weeks/6`],
  [['routines', id, 'weeks', '52'], `/routines/${id}/weeks/52`],
  [['exercises', id, 'like'], `/exercises/${id}/like`],
  [['me', 'exercises', id, 'preference'], `/me/exercises/${id}/preference`],
  // RF-B1: los tipos nuevos de moderación, en la cola, el caso y las acciones.
  [['admin', 'moderation', 'cases', 'ROUTINE', id], `/admin/moderation/cases/ROUTINE/${id}`],
  [['admin', 'moderation', 'cases', 'EXERCISE', id, 'claim'], `/admin/moderation/cases/EXERCISE/${id}/claim`],
  [['admin', 'moderation', 'cases', 'COMMENT', id, 'resolve'], `/admin/moderation/cases/COMMENT/${id}/resolve`],
  // Los cuatro tipos antiguos siguen pasando.
  ...(['STORY', 'PROFILE_PHOTO', 'CHAT_MESSAGE', 'USER'] as const).map(
    (kind): [string[], string] => [
      ['admin', 'moderation', 'cases', kind, id, 'release'],
      `/admin/moderation/cases/${kind}/${id}/release`,
    ],
  ),
  // RF-B2 y RF-B3.
  [['admin', 'routines'], '/admin/routines'],
  [['admin', 'routines', id, 'official'], `/admin/routines/${id}/official`],
  [['admin', 'routines', id, 'insights'], `/admin/routines/${id}/insights`],
  [['admin', 'support', 'users', id, 'training'], `/admin/support/users/${id}/training`],
  [
    ['admin', 'support', 'programs', id, 'recompute-week'],
    `/admin/support/programs/${id}/recompute-week`,
  ],
];
const blockedCases: Array<[string[]]> = [
  [['muscles', 'PECTORALIS_MAJOR', 'secrets']],
  [['muscles', '_hidden']],
  [['admin', 'access', 'mock', 'events']],
  [['admin', 'unknown']],
  [['..', 'secrets']],
  [['gateway', 'events']],
  [['admin', 'media', id]],
  // `targetKind` es el enum cerrado de moderación, no un comodín.
  [['admin', 'moderation', 'cases', 'BOGUS_KIND', id]],
  [['admin', 'moderation', 'cases', 'ROUTINES', id]],
  [['admin', 'moderation', 'cases', 'routine', id]],
  // Rutinas y soporte: parecidas a las permitidas, pero no lo son.
  [['admin', 'routines', id]],
  [['admin', 'routines', id, 'insight']],
  [['admin', 'routines', id, 'official', 'extra']],
  [['admin', 'routines', 'official']],
  [['admin', 'support']],
  [['admin', 'support', 'users', id]],
  [['admin', 'support', 'users', id, 'training', 'extra']],
  [['admin', 'support', 'users', id, 'trainings']],
  [['admin', 'support', 'programs', id]],
  [['admin', 'support', 'programs', id, 'recompute']],
  [['admin', 'support', 'programs', id, 'recompute-weeks']],
  // La administración del catálogo de la senda no pasa por el BFF: la pantalla
  // que la consumirá todavía no existe, y abrir la ruta antes de tener quien la
  // use sería dejar accesible desde el navegador una API que nadie vigila.
  [['admin', 'progression', 'badges']],
  [['admin', 'progression', 'levels']],
  // Las interacciones son cuatro listas concretas, no un prefijo abierto: una
  // entrada comodín bajo `/me/interactions` publicaría al navegador cualquier
  // ruta que el backend añada ahí mañana.
  [['me', 'interactions']],
  [['me', 'interactions', 'blocked']],
  [['me', 'discovery']],
  // `push` no es un prefijo abierto: sólo la configuración pública pasa.
  [['notifications', 'push']],
  [['notifications', 'device-tokens', id]],
  // Rutinas REPP F1: cada ruta nueva tiene una parecida que NO debe pasar. Las
  // de publicar, copiar, compartir y programas llegan en otras fases.
  [['routines', id, 'calendars']],
  [['routines', id, 'structure', 'extra']],
  [['routines', id, 'weeks']],
  [['routines', id, 'weeks', 'abc']],
  [['routines', id, 'weeks', '123']],
  [['routines', id, 'weeks', '6', 'extra']],
  [['routines', id, 'publish']],
  [['routines', id, 'copy']],
  [['routines', id, 'shares']],
  [['exercises', id, 'likes']],
  [['exercises', id, 'like', 'extra']],
  [['me', 'exercises', id]],
  [['me', 'exercises', id, 'preferences']],
  [['me', 'exercises', 'preferences']],
  [['programs', 'active']],
];

describe('backend route policy', () => {
  it.each(allowedCases)('allows a verified route', (parts, expected) => {
    expect(resolveAllowedBackendPath(parts)).toBe(expected);
  });

  it.each(blockedCases)('blocks an unapproved route', (parts) => {
    expect(resolveAllowedBackendPath(parts)).toBeNull();
  });
});
