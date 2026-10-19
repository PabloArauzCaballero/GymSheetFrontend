// Prepara RF-10 p04/p05, repetible: B tiene UNA copia de «Pierna 3 días» (de A) hecha
// antes de que A publique una versión nueva (añade un ejercicio al viernes).
// Pasos: archiva las copias antiguas de B → A deja la pública sin el extra → B copia →
// A añade el extra (versión + 1, la copia queda desactualizada).
import { call, exerciseId, login } from './rutinas-api.mjs';

const A = await login('athlete.mock@gymsheet.local');
const B = await login('expiring.mock@gymsheet.local');
const mineA = await call(A.token, 'GET', '/routines?scope=mine&limit=50');
const original = mineA.data.items.find((r) => r.nombre === 'Pierna 3 días' && r.visibilidad === 'PUBLIC');
if (!original) throw new Error('Falta «Pierna 3 días» pública: corre seed-rutinas-evidencia.mjs');

const mineB = await call(B.token, 'GET', '/routines?scope=mine&q=Pierna%203&limit=50');
for (const old of mineB.data.items.filter((r) => r.nombre === 'Pierna 3 días' && r.esMia)) {
  await call(B.token, 'DELETE', `/routines/${old.id}`);
}

const extra = await exerciseId(A.token, 'barbell bent over row');
async function putStructure(withExtra) {
  const full = (await call(A.token, 'GET', `/routines/${original.id}`)).data;
  const dias = full.dias.map((d) => ({
    diaSemana: d.diaSemana, nombre: d.nombre,
    ejercicios: [
      ...d.ejercicios
        .filter((e) => !(d.diaSemana === 5 && e.ejercicio.id === extra && !withExtra))
        .map((e) => ({
          ejercicioId: e.ejercicio.id, seriesObjetivo: e.seriesObjetivo, repsMin: e.repsMin, repsMax: e.repsMax,
          pesoObjetivoKg: e.pesoObjetivoKg, rirObjetivo: e.rirObjetivo, descansoSeg: e.descansoSeg, nota: e.nota,
        })),
      ...(d.diaSemana === 5 && withExtra && !d.ejercicios.some((e) => e.ejercicio.id === extra)
        ? [{ ejercicioId: extra, seriesObjetivo: 4, repsMin: 8, repsMax: 10, pesoObjetivoKg: null, rirObjetivo: 2, descansoSeg: 90, nota: null }]
        : []),
    ],
  }));
  const put = await call(A.token, 'PUT', `/routines/${original.id}/structure`, { dias });
  if (put.status >= 300) throw new Error(JSON.stringify(put.error));
  return put.data.version;
}

await putStructure(false);
const copy = await call(B.token, 'POST', `/routines/${original.id}/copy`);
if (copy.status >= 300) throw new Error(JSON.stringify(copy.error));
const version = await putStructure(true);
console.log('copia de B', copy.data.id, '· original en versión', version);
