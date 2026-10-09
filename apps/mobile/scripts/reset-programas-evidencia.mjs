// Deja a la cuenta A (athlete.mock) sin programas activos ni sesiones abiertas, para repetir los flujos 17–23.
import { call, login } from './rutinas-api.mjs';

const A = await login('athlete.mock@gymsheet.local');
const active = (await call(A.token, 'GET', '/programs/active')).data;
for (const program of [active.fuerza, active.cardio].filter(Boolean)) {
  const stopped = await call(A.token, 'POST', `/programs/${program.id}/stop`);
  console.log('detenido', program.carril, program.rutinaNombre ?? program.id, stopped.status);
}
const sessions = (await call(A.token, 'GET', '/workouts?page=1&pageSize=20')).data.items ?? [];
for (const open of sessions.filter((s) => s.estado === 'EN_PROGRESO')) {
  await call(A.token, 'PATCH', `/workouts/${open.id}/cancel`);
  console.log('sesión cancelada', open.id);
}
