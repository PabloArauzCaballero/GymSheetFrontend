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
  [['exercises', 'equipment-suggestion'], '/exercises/equipment-suggestion'],
  [['muscles'], '/muscles'],
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
];
const blockedCases: Array<[string[]]> = [
  [['admin', 'access', 'mock', 'events']],
  [['admin', 'unknown']],
  [['..', 'secrets']],
  [['gateway', 'events']],
  [['admin', 'media', id]],
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
];

describe('backend route policy', () => {
  it.each(allowedCases)('allows a verified route', (parts, expected) => {
    expect(resolveAllowedBackendPath(parts)).toBe(expected);
  });

  it.each(blockedCases)('blocks an unapproved route', (parts) => {
    expect(resolveAllowedBackendPath(parts)).toBeNull();
  });
});
