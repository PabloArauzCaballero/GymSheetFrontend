/**
 * Textos de avance semanal (RF-17). Una semana puede recibir más sesiones o minutos de los
 * planeados (semana de entrada parcial, sesiones extra): «3 / 1 sesiones» y «96 / 30 min» se leen
 * como un error, así que cuando se supera lo planeado se dice «de más» en vez de una fracción
 * mayor que uno.
 */

/** «1 / 3 sesiones»; superado: «3 sesiones · 2 más de las 1 planeadas». */
export function describeWeekSessions(done: number, plan: number): string {
  if (plan <= 0) return done > 0 ? `${done} ${done === 1 ? 'sesión' : 'sesiones'}` : 'Sin sesiones planeadas';
  if (done <= plan) return `${done} / ${plan} ${plan === 1 ? 'sesión' : 'sesiones'}`;
  const extra = done - plan;
  return `${done} ${done === 1 ? 'sesión' : 'sesiones'} · ${extra} extra sobre el plan de ${plan}`;
}

/** «45 / 90 min»; superado: «96 min · meta de 30 min superada». */
export function describeWeekMinutes(done: number, target: number): string {
  const minutes = Math.round(done);
  if (target <= 0) return `${minutes} min`;
  if (minutes <= target) return `${minutes} / ${target} min`;
  return `${minutes} min · meta de ${target} min superada`;
}
