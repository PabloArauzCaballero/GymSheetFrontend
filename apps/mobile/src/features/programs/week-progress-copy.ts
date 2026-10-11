/**
 * Texto de avance semanal (RF-17). Una semana puede recibir más sesiones de las planeadas
 * (semana de entrada parcial): «3 / 1 sesiones» se lee como un error, así que al superar el plan se
 * dice cuántas sobran en vez de una fracción mayor que uno. Los minutos: `weekMinutesLabel` (hooks).
 */

/** «1 / 3 sesiones»; superado: «3 sesiones · 2 extra sobre el plan de 1». */
export function describeWeekSessions(done: number, plan: number): string {
  if (plan <= 0) return done > 0 ? `${done} ${done === 1 ? 'sesión' : 'sesiones'}` : 'Sin sesiones planeadas';
  if (done <= plan) return `${done} / ${plan} ${plan === 1 ? 'sesión' : 'sesiones'}`;
  const extra = done - plan;
  return `${done} ${done === 1 ? 'sesión' : 'sesiones'} · ${extra} extra sobre el plan de ${plan}`;
}
