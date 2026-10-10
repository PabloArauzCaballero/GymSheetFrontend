#!/usr/bin/env node
/**
 * Siembra los datos que necesitan las pruebas de evidencia de rutinas REPP
 * (RF-B1..B3) contra un backend local y su base desechable.
 *
 *   BACKEND_API_URL=http://localhost:3011/api/v1 \
 *   PGPORT=5433 PGHOST=localhost PGUSER=postgres PGDATABASE=gym_sheet \
 *   node scripts/seed-evidencia-rutinas.mjs
 *
 * Todo pasa por la API pública salvo lo que la API no expone: subir el rol de
 * una cuenta y dejar vencida una semana de programa (esto último es lo mismo
 * que hace `test/support-training.e2e-spec.ts` del backend). Escribe
 * `.e2e-assets/rutinas-seed.json`, que leen los specs. Cada corrida crea
 * cuentas nuevas, así que se puede repetir sin limpiar nada.
 *
 * Hay un juego de datos por combinación de la evidencia (390/1440 por claro/
 * oscuro) y cada uno vive en su propio gimnasio: los pasos que cambian cosas
 * (ocultar, restaurar, recalcular) gastan su caso, y así las cuatro corridas no
 * se pisan ni ven las cuentas de las otras. El «otro gimnasio» es `megatlon`.
 *
 * Denunciar tiene un tope de 20 por hora y por IP, contado en la memoria de
 * cada proceso del backend, y esta siembra hace 28 denuncias (siete por juego).
 * Por eso `BACKEND_API_URL` admite dos o más backends contra la misma base,
 * separados por comas, y las denuncias se reparten entre ellos.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Una o varias URLs separadas por comas. Todo va a la primera; las denuncias se
// reparten entre todas (ver el aviso sobre el tope de denuncias más abajo).
const APIS = (process.env.BACKEND_API_URL ?? 'http://localhost:3011/api/v1').split(',');
const API = APIS[0];
const PASSWORD = 'QaRutinas2026!';
const OTHER_GYM = 'megatlon';
const COMBOS = [
  ['390-claro', 'ultrafit'],
  ['390-oscuro', 'aesgym'],
  ['1440-claro', 'body-masters-fitness-center'],
  ['1440-oscuro', 'ufc-gym-bolivia'],
];
const run = Date.now().toString(36);

function sql(statement) {
  return execFileSync('psql', ['-tA', '-c', statement], { encoding: 'utf8' }).trim();
}

async function call(method, path, token, body, base = API) {
  const response = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status} ${JSON.stringify(json).slice(0, 300)}`);
  return json.data ?? json;
}

async function account(tag, nombre, { role, tenantId } = {}) {
  const email = `qa-rep-${tag}-${run}@example.test`;
  await call('POST', '/auth/register', null, {
    email,
    password: PASSWORD,
    nombreCompleto: nombre,
    acceptedTerms: true,
    ...(tenantId ? { tenantId } : {}),
  });
  if (role) sql(`UPDATE public.usuarios SET rol='${role}' WHERE email='${email}'`);
  const session = await call('POST', '/auth/login', null, { email, password: PASSWORD });
  const me = await call('GET', '/users/me', session.accessToken);
  return { email, nombre, id: me.id, token: session.accessToken };
}


// Las siembras anteriores comparten gimnasio con ésta: se cierran sus casos
// abiertos para que la cola de cada gimnasio sólo tenga los de esta corrida.
sql(`UPDATE moderation.reports SET status='DESCARTADO', resolution='SIN_ACCION', resolved_at=now() WHERE status IN ('PENDIENTE','EN_REVISION')
       AND reported_user_id IN (SELECT id FROM public.usuarios WHERE email LIKE 'qa-rep-%@example.test')`);

const sys = await account('sys', `QA Sistema ${run}`, { role: 'SYSTEM_ADMIN' });
const other = await account('otro', `QA Admin Otro Gimnasio ${run}`, { role: 'ADMIN', tenantId: OTHER_GYM });
const grant = (user, keys) =>
  Promise.all(keys.map((permissionKey) => call('POST', `/admin/permissions/${user.id}`, sys.token, { permissionKey })));
await grant(other, ['moderation:read', 'moderation:act']);

const isoWeekday = (date) => (date.getDay() === 0 ? 7 : date.getDay());
const today = new Date();
const monday = new Date(today);
monday.setDate(today.getDate() - (isoWeekday(today) - 1));
const lastMonday = new Date(monday);
lastMonday.setDate(monday.getDate() - 7);
const iso = (date) => date.toISOString().slice(0, 10);

const day = (nombre, diaSemana, ejercicioIds) => ({
  diaSemana,
  nombre,
  ejercicios: ejercicioIds.map((ejercicioId) => ({ ejercicioId, seriesObjetivo: 3, repsMin: 8, repsMax: 12 })),
});

async function seedCombo(combo, tenantId, comboIndex) {
  const tag = `${run}-${combo}`;
  const gym = await account(`gym-${combo}`, `QA Admin Gimnasio ${combo}`, { role: 'ADMIN', tenantId });
  const reader = await account(`lector-${combo}`, `QA Soporte Lectura ${combo}`, { role: 'ADMIN', tenantId });
  const author = await account(`autor-${combo}`, `Ana Autora ${combo}`, { tenantId });
  const memberA = await account(`socio-a-${combo}`, `Socio A ${combo}`, { tenantId });
  const memberB = await account(`socio-b-${combo}`, `Socio B ${combo}`, { tenantId });
  // Quien denuncia tiene que poder ver el contenido, y eso se limita al gimnasio.
  const reporters = [];
  for (const n of [1, 2, 3]) reporters.push(await account(`rep${n}-${combo}`, `Reportero ${n} ${combo}`, { tenantId }));
  // El administrador modera y atiende soporte; el lector sólo mira.
  await grant(gym, ['moderation:read', 'moderation:act', 'support:read', 'support:respond', 'analytics:read']);
  await grant(reader, ['moderation:read', 'support:read']);

  // Una página al azar del catálogo: la huella de publicación impide dos
  // rutinas públicas con los mismos ejercicios, y repetir la siembra chocaría.
  const freshIds = async () => {
    const catalog = await call('GET', `/exercises?pageSize=8&page=${1 + Math.floor(Math.random() * 150)}`, author.token);
    return (catalog.items ?? catalog).map((exercise) => exercise.id);
  };
  const ids = await freshIds();
  // Publica con ejercicios nuevos hasta que la huella no choque con una rutina ya pública.
  const publish = async (owner, build) => {
    for (let attempt = 1; ; attempt += 1) {
      const created = await call('POST', '/routines', owner.token, { visibilidad: 'PRIVATE', ...build(await freshIds()) });
      try {
        await call('POST', `/routines/${created.id}/publish`, owner.token);
        return created.id;
      } catch (error) {
        if (attempt >= 8 || !String(error).includes('409')) throw error;
      }
    }
  };

  const dangerousName = `Empuje y tirón extremo ${tag}`;
  const dangerous = await publish(author, (fresh) => ({
    nombre: dangerousName,
    descripcion: 'Rutina de empuje y tirón con cargas máximas desde la primera semana.',
    dias: [day('Empuje', 1, fresh.slice(0, 3)), day('Tirón', 3, fresh.slice(3, 6))],
  }));
  // Dos socios se la copian: es el «alcance» que ve quien modera.
  await call('POST', `/routines/${dangerous}/copy`, memberA.token, {});
  await call('POST', `/routines/${dangerous}/copy`, memberB.token, {});
  const plagiarizedName = `Rutina copiada ${tag}`;
  const plagiarized = await publish(author, (fresh) => ({ nombre: plagiarizedName, dias: [day('Único', 2, fresh.slice(6, 8))] }));

  const exerciseName = `Dominadas colgado ${tag}`;
  const privateExercise = await call('POST', '/exercises/personal', author.token, { nombre: exerciseName, grupoMuscular: 'ESPALDA' });
  await publish(author, (fresh) => ({
    nombre: `Espalda con ejercicio propio ${tag}`,
    dias: [
      {
        diaSemana: 4,
        nombre: 'Espalda',
        ejercicios: [privateExercise.id, fresh[0]].map((ejercicioId) => ({ ejercicioId, seriesObjetivo: 4, repsMin: 5, repsMax: 8 })),
      },
    ],
  }));

  const commentText = `Esta rutina es un fraude ${tag}`;
  const comment = await call('POST', `/comments/ROUTINE/${plagiarized}`, memberB.token, { texto: commentText });

  const base = APIS[comboIndex % APIS.length];
  const report = (token, body) => call('POST', '/me/reports', token, body, base);
  // Tres denunciantes distintos ocultan la rutina sola (regla del backend): queda
  // oculta y con el caso abierto, que es donde se prueba «Restaurar».
  for (const reporter of reporters) {
    await report(reporter.token, { targetKind: 'ROUTINE', targetId: dangerous, reason: 'EJERCICIO_PELIGROSO' });
  }
  await report(reporters[0].token, {
    targetKind: 'ROUTINE', targetId: plagiarized, reason: 'PLAGIO', details: 'Es una copia de otra rutina con cambios mínimos.',
  });
  await report(reporters[0].token, {
    targetKind: 'EXERCISE', targetId: privateExercise.id, reason: 'INFORMACION_ENGANOSA', details: 'La técnica descrita es incorrecta.',
  });
  await report(reporters[0].token, {
    targetKind: 'COMMENT', targetId: comment.id, reason: 'ACOSO', details: 'Insulta al autor de la rutina.',
  });
  // Un tipo de los de siempre, para ver que la cola mezcla bien los viejos y los nuevos.
  await report(reporters[0].token, { targetKind: 'USER', targetId: memberB.id, reason: 'SPAM' });

  // Soporte: dos socios con la semana 1 vencida sin cumplir.
  async function programWithDueWeek(member, routineName, { trained }) {
    const routine = await call('POST', '/routines', member.token, {
      nombre: routineName,
      duracionSemanas: 4,
      dias: [day('Fuerza', isoWeekday(today), ids.slice(0, 1))],
    });
    const program = await call('POST', '/programs/strength/activate', member.token, {
      routineId: routine.id, modo: 'PROGRESSIVE_OVERLOAD', diasSemana: [isoWeekday(today)],
    });
    // Se corre el programa una semana atrás y la 1 queda vencida sin cumplir.
    sql(`UPDATE training.program_weeks SET semana_inicio = semana_inicio - 7 WHERE program_id='${program.id}'`);
    sql(`UPDATE training.training_programs SET fecha_inicio = fecha_inicio - 7, fecha_fin_prevista = fecha_fin_prevista - 7 WHERE id='${program.id}'`);
    sql(`UPDATE training.program_weeks SET cumplida=false, multiplicador=1.00, cerrada_en=now() WHERE program_id='${program.id}' AND semana_numero=1`);
    if (trained) {
      const session = await call('POST', '/workouts', member.token, {});
      const exercise = await call('POST', `/workouts/${session.id}/exercises`, member.token, { ejercicioId: ids[0], orden: 1, esEnfasis: false });
      for (let n = 1; n <= 3; n += 1) {
        await call('POST', `/workouts/session-exercises/${exercise.id}/sets`, member.token, {
          numeroSerie: n, repeticiones: 8, pesoKg: 50, rir: 2, descansoSegAnterior: 60,
        });
      }
      await call('PATCH', `/workouts/${session.id}/finish`, member.token, {});
      sql(`UPDATE public.sesiones_entrenamiento SET program_id='${program.id}', fecha_inicio='${iso(lastMonday)} 18:00+00', fecha_fin='${iso(lastMonday)} 18:45+00' WHERE id='${session.id}'`);
    }
    return program.id;
  }
  const programA = await programWithDueWeek(memberA, `Fuerza socio A ${tag}`, { trained: true });
  const programB = await programWithDueWeek(memberB, `Fuerza socio B ${tag}`, { trained: false });

  // Una invitación pendiente para el socio A (sólo se comparten rutinas privadas).
  await call('POST', '/routines', author.token, { nombre: `Rutina compartida ${tag}`, dias: [day('Único', 5, ids.slice(6, 8))] }).then((shared) =>
    call('POST', `/routines/${shared.id}/shares`, author.token, { usuarioIds: [memberA.id] }),
  );

  return {
    tenantId,
    gym: gym.email,
    author: author.email,
    reader: reader.email,
    memberA: { email: memberA.email, id: memberA.id, nombre: memberA.nombre, programId: programA },
    memberB: { email: memberB.email, id: memberB.id, nombre: memberB.nombre, programId: programB },
    dangerous: { id: dangerous, nombre: dangerousName },
    plagiarized: { id: plagiarized, nombre: plagiarizedName },
    privateExercise: { id: privateExercise.id, nombre: exerciseName },
    comment: { id: comment.id, texto: commentText },
    officialName: `REPP QA ${tag}`,
  };
}

const combos = {};
for (const [index, [combo, tenantId]] of COMBOS.entries()) combos[combo] = await seedCombo(combo, tenantId, index);

const probe = await call('GET', '/exercises?pageSize=1', sys.token);
const seed = {
  run,
  password: PASSWORD,
  sys: sys.email,
  other: other.email,
  /** Un ejercicio del catálogo, para el buscador del formulario «Crear oficial». */
  catalogExercise: (probe.items ?? probe)[0].nombre,
  combos,
};
const out = resolve(process.cwd(), '.e2e-assets/rutinas-seed.json');
mkdirSync(resolve(process.cwd(), '.e2e-assets'), { recursive: true });
writeFileSync(out, JSON.stringify(seed, null, 2));
console.log(`Siembra lista (${run}) en ${out}`);
