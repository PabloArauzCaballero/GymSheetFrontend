// Siembra las rutinas que usan los flujos Maestro 11–16 (catálogo, detalle, publicar, copiar, comunidad).
// Cuentas: athlete.mock (A) y expiring.mock (B). Idempotente.
import { call, day, ensureRoutine, exerciseId, ex, login } from './rutinas-api.mjs';

const A = await login('athlete.mock@gymsheet.local');
const B = await login('expiring.mock@gymsheet.local');
const id = {
  bench: await exerciseId(A.token, 'barbell bench press'),
  incline: await exerciseId(A.token, 'dumbbell incline bench press'),
  row: await exerciseId(A.token, 'barbell bent over row'),
  squat: await exerciseId(A.token, 'barbell squat'),
  deadlift: await exerciseId(A.token, 'barbell deadlift'),
  curl: await exerciseId(A.token, 'dumbbell biceps curl'),
};

const push = await ensureRoutine(A.token, A.user.id, {
  nombre: 'Empuje 4 días', objetivo: 'HIPERTROFIA', duracionSemanas: 12,
  dias: [
    day(1, 'Empuje', [ex(id.bench, 4, 6, 8, 60), ex(id.incline, 3, 8, 12)]),
    day(2, 'Tirón', [ex(id.row, 4, 8, 10), ex(id.curl, 3, 10, 12)]),
    day(4, 'Pierna', [ex(id.squat, 4, 6, 8), ex(id.deadlift, 3, 5, 5)]),
    day(5, 'Torso', [ex(id.bench, 3, 8, 10), ex(id.row, 3, 8, 10)]),
  ],
});
const leg = await ensureRoutine(A.token, A.user.id, {
  nombre: 'Pierna 3 días', objetivo: 'FUERZA', duracionSemanas: 8,
  dias: [
    day(1, 'Sentadilla', [ex(id.squat, 5, 3, 5, 80)]),
    day(3, 'Peso muerto', [ex(id.deadlift, 5, 3, 5, 100)]),
    day(5, 'Accesorios', [ex(id.curl, 3, 10, 12)]),
  ],
});
await ensureRoutine(A.token, A.user.id, {
  nombre: 'Borrador privado', objetivo: 'SALUD_GENERAL', duracionSemanas: 4,
  dias: [day(null, null, [ex(id.row, 3, 10, 12)])],
});
const bRoutine = await ensureRoutine(B.token, B.user.id, {
  nombre: 'Torso de Leo', objetivo: 'HIPERTROFIA', duracionSemanas: 8,
  dias: [day(2, 'Torso', [ex(id.incline, 4, 8, 12), ex(id.curl, 3, 12, 15)]), day(4, 'Espalda', [ex(id.row, 4, 8, 10)])],
});

for (const [token, routineId] of [[A.token, push], [A.token, leg], [B.token, bRoutine]]) {
  const r = await call(token, 'POST', `/routines/${routineId}/publish`);
  console.log('publish', routineId, r.status, r.error?.code ?? '');
}
console.log(JSON.stringify({ push, leg, bRoutine }));
