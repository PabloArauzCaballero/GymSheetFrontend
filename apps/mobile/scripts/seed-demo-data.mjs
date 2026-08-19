/**
 * Llena la base local con datos de verdad para el atleta de la semilla.
 *
 * Uso:  node apps/mobile/scripts/seed-demo-data.mjs
 * (con el backend en marcha y `yarn db:seed:all:development` ya ejecutado)
 *
 * Las semillas del backend sólo crean usuarios, así que la app se veía entera
 * en estados vacíos: sin membresía, sin rutinas, sin ejercicios y sin
 * historial. Eso alcanza para probar que las pantallas cargan, pero no para
 * ver la UI que la gente usa. Todo se crea por la API, con los mismos roles y
 * validaciones que en producción; nada se escribe a mano en PostgreSQL.
 */
const BASE = 'http://localhost:3011/api/v1';
const ADMIN = { email: 'admin@gymsheet.local', password: 'AdminLocal2026!' };
const COACH = { email: 'coach.mock@gymsheet.local', password: 'MockLocal2026!' };
const ATHLETE = { email: 'athlete.mock@gymsheet.local', password: 'MockLocal2026!' };

async function login({ email, password }) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`login ${email}: ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  return { token: j.data.accessToken, user: j.data.user };
}

function api(token) {
  return async (method, path, body) => {
    const r = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* respuesta vacía */ }
    if (!r.ok) {
      const detail = json?.detail ?? json?.error?.message ?? text.slice(0, 300);
      throw Object.assign(new Error(`${method} ${path} -> ${r.status}: ${detail}`), { status: r.status });
    }
    return json?.data ?? json;
  };
}

const iso = (d) => d.toISOString().slice(0, 10);
const daysFromNow = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

const EJERCICIOS = [
  { nombre: 'Press de banca', grupoMuscular: 'Pecho', bodyPart: 'Tren superior', targetMuscle: 'Pectoral mayor',
    descripcion: 'Empuje horizontal con barra sobre banco plano.' },
  { nombre: 'Sentadilla trasera', grupoMuscular: 'Piernas', bodyPart: 'Tren inferior', targetMuscle: 'Cuádriceps',
    descripcion: 'Barra sobre trapecios, descenso hasta romper paralela.' },
  { nombre: 'Peso muerto convencional', grupoMuscular: 'Espalda', bodyPart: 'Cadena posterior', targetMuscle: 'Erectores espinales',
    descripcion: 'Tirón desde el suelo con cadera y rodilla extendiendo a la vez.' },
  { nombre: 'Dominadas', grupoMuscular: 'Espalda', bodyPart: 'Tren superior', targetMuscle: 'Dorsal ancho',
    descripcion: 'Tracción vertical con agarre prono.' },
  { nombre: 'Press militar', grupoMuscular: 'Hombro', bodyPart: 'Tren superior', targetMuscle: 'Deltoides anterior',
    descripcion: 'Empuje vertical de pie con barra.' },
  { nombre: 'Remo con barra', grupoMuscular: 'Espalda', bodyPart: 'Tren superior', targetMuscle: 'Dorsal ancho',
    descripcion: 'Tracción horizontal con torso inclinado.' },
  { nombre: 'Curl de bíceps con barra', grupoMuscular: 'Brazos', bodyPart: 'Tren superior', targetMuscle: 'Bíceps braquial',
    descripcion: 'Flexión de codo con barra recta.' },
  { nombre: 'Extensión de tríceps en polea', grupoMuscular: 'Brazos', bodyPart: 'Tren superior', targetMuscle: 'Tríceps braquial',
    descripcion: 'Extensión de codo con cuerda en polea alta.' },
];

async function main() {
  const admin = await login(ADMIN);
  const coach = await login(COACH);
  const athlete = await login(ATHLETE);
  const asAdmin = api(admin.token);
  const asCoach = api(coach.token);
  const asAthlete = api(athlete.token);
  console.log('sesiones abiertas: admin, coach, atleta');

  // ── Sede ────────────────────────────────────────────────────────────────
  const sedes = await asAdmin('GET', '/admin/facilities/branches?page=1&pageSize=20');
  let sede = (sedes.items ?? sedes)[0];
  if (!sede) {
    sede = await asAdmin('POST', '/admin/facilities/branches', {
      codigo: 'CENTRAL',
      nombre: 'GymSheet Central',
      descripcion: 'Sede principal.',
    });
  }
  console.log('sede:', sede.nombre ?? sede.name, sede.id);

  // ── Plan y membresía activa para el atleta ──────────────────────────────
  const planes = await asAdmin('GET', '/admin/membership/plans');
  let plan = (planes.items ?? planes).find((p) => (p.codigo ?? p.code) === 'PRO-MENSUAL');
  if (!plan) {
    plan = await asAdmin('POST', '/admin/membership/plans', {
      codigo: 'PRO-MENSUAL',
      nombre: 'Pro Mensual',
      descripcion: 'Acceso completo a sala y clases dirigidas.',
      tipo: 'MONTHLY',
      duracionDias: 30,
      alcances: [{ sedeId: sede.id }],
      precio: 350,
      moneda: 'BOB',
      beneficios: ['Acceso ilimitado a sala', 'Clases dirigidas', 'Seguimiento del entrenador'],
    });
  }
  console.log('plan:', plan.nombre ?? plan.name, plan.id);

  const memb = await asAdmin('GET', `/admin/membership/memberships?page=1&pageSize=20&userId=${athlete.user.id}`);
  if (!(memb.items ?? memb).length) {
    // Empieza hace 10 días: así la app muestra vencimiento y días restantes
    // reales en vez de un plan recién estrenado.
    await asAdmin('POST', '/admin/membership/memberships', {
      clienteUsuarioId: athlete.user.id,
      planId: plan.id,
      iniciaEl: iso(daysFromNow(-10)),
      notas: 'Alta de demostración.',
    });
  }
  console.log('membresía activa para', athlete.user.email);

  // ── Catálogo de ejercicios ──────────────────────────────────────────────
  const creados = {};
  for (const e of EJERCICIOS) {
    try {
      const x = await asAdmin('POST', '/admin/exercises/global', e);
      creados[e.nombre] = x.id;
    } catch (err) {
      if (err.status !== 409) throw err;
    }
  }
  const catalogo = await asAthlete('GET', '/exercises?page=1&pageSize=100');
  for (const e of catalogo.items ?? []) creados[e.nombre] = e.id;
  console.log('ejercicios en catálogo:', (catalogo.items ?? []).length);

  const id = (n) => {
    const v = creados[n];
    if (!v) throw new Error(`falta el ejercicio ${n}`);
    return v;
  };

  // ── Rutina del entrenador, asignada al atleta ───────────────────────────
  const misRutinas = await asCoach('GET', '/routines?page=1&pageSize=50');
  let rutina = (misRutinas.items ?? []).find((r) => r.nombre === 'Empuje - Día 1');
  if (!rutina) {
    rutina = await asCoach('POST', '/routines', {
      nombre: 'Empuje - Día 1',
      descripcion: 'Pecho, hombro y tríceps. Progresión de carga semanal.',
      visibilidad: 'SHARED',
      objetivo: 'HIPERTROFIA',
    });
    const prescripcion = [
      { n: 'Press de banca', orden: 1, series: 4, min: 6, max: 8, peso: 60, rir: 2, descanso: 150 },
      { n: 'Press militar', orden: 2, series: 3, min: 8, max: 10, peso: 35, rir: 2, descanso: 120 },
      { n: 'Extensión de tríceps en polea', orden: 3, series: 3, min: 10, max: 12, peso: 25, rir: 1, descanso: 90 },
    ];
    for (const p of prescripcion) {
      await asCoach('POST', `/routines/${rutina.id}/exercises`, {
        ejercicioId: id(p.n), orden: p.orden, seriesObjetivo: p.series,
        repsMin: p.min, repsMax: p.max, pesoObjetivoKg: p.peso,
        rirObjetivo: p.rir, descansoSeg: p.descanso,
      });
    }
    await asCoach('POST', `/routines/${rutina.id}/assign`, {
      clienteUsuarioId: athlete.user.id,
      fechaProgramada: iso(daysFromNow(1)),
      diasSemana: [1, 3, 5],
      nota: 'Sube 2,5 kg en banca cuando cierres las 4 series a RIR 2.',
    });
  }
  console.log('rutina asignada:', rutina.nombre ?? rutina.name);

  // Una segunda rutina propia del atleta, para que «Todas» no tenga una sola.
  const suyas = await asAthlete('GET', '/routines?page=1&pageSize=50');
  if (!(suyas.items ?? []).some((r) => r.nombre === 'Tirón - Día 2')) {
    const propia = await asAthlete('POST', '/routines', {
      nombre: 'Tirón - Día 2',
      descripcion: 'Espalda y bíceps.',
      objetivo: 'FUERZA',
    });
    for (const p of [
      { n: 'Peso muerto convencional', orden: 1, series: 4, min: 4, max: 6, peso: 90, rir: 2, descanso: 180 },
      { n: 'Dominadas', orden: 2, series: 4, min: 6, max: 10, rir: 1, descanso: 120 },
      { n: 'Remo con barra', orden: 3, series: 3, min: 8, max: 10, peso: 50, rir: 2, descanso: 120 },
      { n: 'Curl de bíceps con barra', orden: 4, series: 3, min: 10, max: 12, peso: 25, rir: 1, descanso: 90 },
    ]) {
      await asAthlete('POST', `/routines/${propia.id}/exercises`, {
        ejercicioId: id(p.n), orden: p.orden, seriesObjetivo: p.series,
        repsMin: p.min, repsMax: p.max,
        ...(p.peso ? { pesoObjetivoKg: p.peso } : {}),
        rirObjetivo: p.rir, descansoSeg: p.descanso,
      });
    }
    await asAthlete('POST', `/routines/${propia.id}/schedule`, {
      diasSemana: [2, 4],
      repiteHasta: iso(daysFromNow(28)),
    });
    console.log('rutina propia creada y programada:', propia.nombre);
  }

  // ── Historial de entrenos ───────────────────────────────────────────────
  const previas = await asAthlete('GET', '/workouts?page=1&pageSize=20');
  if ((previas.total ?? 0) < 3) {
    const sesiones = [
      { obs: 'Sesión de empuje. Buenas sensaciones en banca.',
        ej: [
          { n: 'Press de banca', sets: [[8, 60, 2], [8, 60, 2], [7, 62.5, 1], [6, 62.5, 1]] },
          { n: 'Press militar', sets: [[10, 35, 2], [9, 35, 2], [8, 35, 1]] },
        ] },
      { obs: 'Tirón pesado. Peso muerto a tope.',
        ej: [
          { n: 'Peso muerto convencional', sets: [[5, 90, 2], [5, 95, 1], [4, 100, 0]] },
          { n: 'Dominadas', sets: [[10, 0, 2], [8, 0, 1], [7, 0, 0]] },
        ] },
      { obs: 'Accesorios y brazos.',
        ej: [
          { n: 'Curl de bíceps con barra', sets: [[12, 25, 2], [11, 25, 1], [10, 27.5, 1]] },
          { n: 'Extensión de tríceps en polea', sets: [[12, 25, 2], [12, 25, 1]] },
        ] },
    ];
    for (const s of sesiones) {
      const sesion = await asAthlete('POST', '/workouts', { observacion: s.obs });
      let orden = 1;
      for (const e of s.ej) {
        const se = await asAthlete('POST', `/workouts/${sesion.id}/exercises`, {
          ejercicioId: id(e.n), orden: orden++,
        });
        let numero = 1;
        for (const [reps, peso, rir] of e.sets) {
          await asAthlete('POST', `/workouts/session-exercises/${se.id}/sets`, {
            numeroSerie: numero++, repeticiones: reps, pesoKg: peso, rir,
            descansoSegAnterior: 120,
          });
        }
      }
      await asAthlete('PATCH', `/workouts/${sesion.id}/finish`, {});
    }
    console.log('3 sesiones finalizadas con sus series');
  }

  // ── Perfil físico ───────────────────────────────────────────────────────
  try {
    await asAthlete('GET', '/profile');
  } catch (err) {
    if (err.status !== 404) throw err;
    await asAthlete('POST', '/profile', {
      pesoKg: 78.5, estaturaCm: 178, edad: 29, objetivo: 'HIPERTROFIA',
    });
    console.log('perfil físico creado');
  }

  // ── Comprobación final desde los ojos del atleta ────────────────────────
  const [m, asig, w, ex] = await Promise.all([
    asAthlete('GET', '/me/membership'),
    asAthlete('GET', '/routines/assignments/me'),
    asAthlete('GET', '/workouts?page=1&pageSize=5'),
    asAthlete('GET', '/exercises?page=1&pageSize=5'),
  ]);
  console.log('\n── lo que verá la app ──');
  console.log('membresía   :', m?.membership?.estado ?? m?.estado ?? JSON.stringify(m).slice(0, 120));
  console.log('asignaciones:', Array.isArray(asig) ? asig.length : JSON.stringify(asig).slice(0, 80));
  console.log('entrenos    :', w.total ?? (w.items ?? []).length);
  console.log('ejercicios  :', ex.total ?? (ex.items ?? []).length);
}

main().catch((e) => { console.error('FALLO:', e.message); process.exit(1); });
