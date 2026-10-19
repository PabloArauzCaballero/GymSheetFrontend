// Datos de los flujos 13–16: una rutina de A idéntica a la pública de B (duplicado), una
// privada de A para publicar, una copia de la pública de A hecha por B con versión nueva,
// y una privada de A para compartir. Idempotente; deja `ids-f4.json` en el directorio actual si se pide.
import { call, day, ensureRoutine, exerciseId, ex, login } from './rutinas-api.mjs';

const A = await login('athlete.mock@gymsheet.local');
const B = await login('expiring.mock@gymsheet.local');
const e = {
  incline: await exerciseId(A.token, 'dumbbell incline bench press'),
  curl: await exerciseId(A.token, 'dumbbell biceps curl'),
  row: await exerciseId(A.token, 'barbell bent over row'),
  squat: await exerciseId(A.token, 'barbell squat'),
};
const dup = await ensureRoutine(A.token, A.user.id, {
  nombre: 'Torso idéntico', objetivo: 'HIPERTROFIA', duracionSemanas: 8,
  dias: [day(2, 'Torso', [ex(e.incline, 4, 8, 12), ex(e.curl, 3, 12, 15)]), day(4, 'Espalda', [ex(e.row, 4, 8, 10)])],
});
const fresh = await ensureRoutine(A.token, A.user.id, {
  nombre: 'Pierna para publicar', objetivo: 'FUERZA', duracionSemanas: 6,
  dias: [day(1, 'Pierna', [ex(e.squat, 5, 5, 5)])],
});
const share = await ensureRoutine(A.token, A.user.id, {
  nombre: 'Plan para compartir', objetivo: 'HIPERTROFIA', duracionSemanas: 4,
  dias: [day(3, 'Brazos', [ex(e.curl, 3, 10, 12)])],
});
// Ejercicio personal de A dentro de una pública (el flujo 15 lo denuncia desde B). Si moderación
// ya lo ocultó en una corrida anterior (404 al denunciar), se crea otro con sufijo nuevo.
const suffix = Date.now().toString(36).slice(-5);
const personal = await call(A.token, 'POST', '/exercises/personal', {
  nombre: `Press raro de Ana ${suffix}`, grupoMuscular: 'chest', descripcion: 'Ejercicio propio de QA.',
});
if (personal.status >= 300) throw new Error('ejercicio personal: ' + JSON.stringify(personal.error));
// La rutina lleva siempre el mismo nombre (los flujos la buscan por él): se archiva la anterior.
const prevMine = await call(A.token, 'GET', '/routines?scope=mine&q=Denuncia%20QA&limit=20');
for (const old of prevMine.data.items.filter((r) => r.nombre === 'Denuncia QA')) {
  await call(A.token, 'DELETE', `/routines/${old.id}`);
}
const denuncia = await ensureRoutine(A.token, A.user.id, {
  nombre: 'Denuncia QA', objetivo: 'HIPERTROFIA', duracionSemanas: 4,
  dias: [day(1, 'Empuje', [ex(e.incline, 3, 8, 12), ex(personal.data.id, 3, 8, 12)])],
});
const pub = await call(A.token, 'POST', `/routines/${denuncia}/publish`);
console.log('denuncia', denuncia, suffix, pub.status);
// El flujo 13 publica «Pierna para publicar»: se deja privada para poder repetirlo.
await call(A.token, 'POST', `/routines/${fresh}/unpublish`);
console.log(JSON.stringify({ dup, fresh, share }));
