// Deja a la cuenta A (athlete.mock) sin programas activos ni sesiones abiertas, para repetir los flujos 17–23.
import { call, day, exerciseId, ex, login } from './rutinas-api.mjs';

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

// «Empuje 4 días» vuelve a su estructura de siembra: los flujos 18–21 la modifican (RF-20 la actualiza).
const mine = (await call(A.token, 'GET', '/routines?scope=mine&q=Empuje%204&limit=20')).data.items;
const push = mine.find((r) => r.nombre === 'Empuje 4 días' && r.esMia);
if (push) {
  const id = {
    bench: await exerciseId(A.token, 'barbell bench press'),
    incline: await exerciseId(A.token, 'dumbbell incline bench press'),
    row: await exerciseId(A.token, 'barbell bent over row'),
    squat: await exerciseId(A.token, 'barbell squat'),
    deadlift: await exerciseId(A.token, 'barbell deadlift'),
    curl: await exerciseId(A.token, 'dumbbell biceps curl'),
  };
  const put = await call(A.token, 'PUT', `/routines/${push.id}/structure`, {
    dias: [
      day(1, 'Empuje', [ex(id.bench, 4, 6, 8, 60), ex(id.incline, 3, 8, 12)]),
      day(2, 'Tirón', [ex(id.row, 4, 8, 10), ex(id.curl, 3, 10, 12)]),
      day(4, 'Pierna', [ex(id.squat, 4, 6, 8), ex(id.deadlift, 3, 5, 5)]),
      day(5, 'Torso', [ex(id.bench, 3, 8, 10), ex(id.row, 3, 8, 10)]),
    ],
  });
  console.log('Empuje 4 días restaurada', put.status);
}
