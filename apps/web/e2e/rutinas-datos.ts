/**
 * Datos de prueba de las rutinas REPP (F3 a F6): cuentas nuevas y rutinas sembradas
 * contra el backend real, sin pasar por la web.
 *
 * Cada prueba crea sus propias cuentas con un sufijo único: así ninguna depende
 * del estado que dejó otra (ni de las rutinas que acumulan las cuentas sembradas),
 * y las capturas muestran siempre el mismo contenido.
 *
 * `BACKEND_API_URL`/`E2E_BACKEND_URL`: la dirección del backend (con `/api/v1`).
 */
const BACKEND = process.env.E2E_BACKEND_URL ?? process.env.BACKEND_API_URL ?? 'http://localhost:3011/api/v1';

export const PASSWORD = 'QaRutinas2026!';

export type Cuenta = {
  id: string;
  email: string;
  password: string;
  nombre: string;
  token: string;
};

export type Respuesta<T = unknown> = {
  status: number;
  data: T;
  code?: string;
  details?: Record<string, unknown>;
};

export type Api = <T = unknown>(method: string, path: string, body?: unknown) => Promise<Respuesta<T>>;

async function llamar<T>(method: string, path: string, body?: unknown, token?: string): Promise<Respuesta<T>> {
  // El backend limita los accesos por minuto: un 429 se espera y se reintenta una vez.
  for (let intento = 0; intento < 3; intento += 1) {
    const response = await fetch(`${BACKEND}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (response.status === 429 && intento < 2) {
      await new Promise((resolve) => setTimeout(resolve, 15_000));
      continue;
    }
    const json = (await response.json().catch(() => null)) as {
      data?: T;
      code?: string;
      details?: Record<string, unknown>;
      error?: { code?: string; details?: Record<string, unknown> };
    } | null;
    return {
      status: response.status,
      data: (json?.data ?? json) as T,
      code: json?.code ?? json?.error?.code,
      details: json?.details ?? json?.error?.details,
    };
  }
  throw new Error(`Sin respuesta de ${method} ${path}`);
}

export function apiDe(cuenta: Pick<Cuenta, 'token'>): Api {
  return (method, path, body) => llamar(method, path, body, cuenta.token);
}

/** Registra una cuenta de socio, termina su alta y devuelve un token. */
export async function crearCuenta(etiqueta: string, nombre: string): Promise<Cuenta> {
  const email = `qa.${etiqueta}.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}@gymsheet.local`;
  const registro = await llamar('POST', '/auth/register', {
    email,
    password: PASSWORD,
    nombreCompleto: nombre,
    acceptedTerms: true,
  });
  if (registro.status !== 201) throw new Error(`Registro rechazado (${registro.status}).`);
  const login = await llamar<{ accessToken: string; user: { id: string } }>('POST', '/auth/login', {
    email,
    password: PASSWORD,
  });
  const token = login.data.accessToken;
  const api = apiDe({ token });
  // El orden importa: la meta abre el alta y el perfil sólo cuenta después.
  await api('PUT', '/me/onboarding/goals', { primaryGoal: 'GAIN_MUSCLE' });
  await api('PUT', '/me/onboarding/profile', {
    weight: 70,
    weightUnit: 'KG',
    height: 175,
    heightUnit: 'CM',
    measuredOn: '2026-10-08',
  });
  await api('PUT', '/me/onboarding/preferences', {
    experienceLevel: 'INTERMEDIATE',
    weeklyFrequency: 4,
    trainingLocation: 'GYM',
    trainingPreferences: [],
    consentHealth: true,
    consentData: true,
  });
  await api('PUT', '/me/onboarding/equipment', { availableEquipment: [] });
  const fin = await api('POST', '/me/onboarding/complete');
  if (fin.status >= 300) throw new Error(`Alta sin terminar (${fin.status}).`);
  return { id: login.data.user.id, email, password: PASSWORD, nombre, token };
}

const idsEjercicio = new Map<string, string>();

/** Id de un ejercicio del catálogo por su nombre exacto (en inglés, como en el dataset importado). */
export async function ejercicioId(api: Api, nombre: string): Promise<string> {
  const guardado = idsEjercicio.get(nombre);
  if (guardado) return guardado;
  const respuesta = await api<{ items: Array<{ id: string; nombre: string }> }>(
    'GET',
    `/exercises?search=${encodeURIComponent(nombre)}&pageSize=50`,
  );
  const exacto = respuesta.data.items.find((item) => item.nombre === nombre);
  if (!exacto) throw new Error(`El ejercicio «${nombre}» no está en el catálogo local.`);
  idsEjercicio.set(nombre, exacto.id);
  return exacto.id;
}

export type DiaSemilla = {
  diaSemana: number | null;
  nombre?: string;
  ejercicios: Array<{
    nombre: string;
    /** Id de un ejercicio propio (personal); sin él se busca `nombre` en el catálogo. */
    id?: string;
    series?: number;
    repsMin?: number;
    repsMax?: number;
    pesoKg?: number | null;
    rir?: number | null;
  }>;
};

export type RutinaSemilla = {
  nombre: string;
  descripcion?: string;
  objetivo?: string | null;
  duracionSemanas?: number;
  descargaCada?: 4 | 5 | 6 | null;
  dias: DiaSemilla[];
};

export type RutinaCreada = {
  id: string;
  nombre: string;
  dias: Array<{ id: string; ejercicios: Array<{ id: string; ejercicio: { id: string; nombre: string } | null }> }>;
};

/** Crea una rutina privada con días y ejercicios reales del catálogo. */
export async function crearRutina(api: Api, semilla: RutinaSemilla): Promise<RutinaCreada> {
  const dias = [];
  for (const dia of semilla.dias) {
    const ejercicios = [];
    for (const item of dia.ejercicios) {
      ejercicios.push({
        ejercicioId: item.id ?? (await ejercicioId(api, item.nombre)),
        seriesObjetivo: item.series ?? 3,
        repsMin: item.repsMin ?? 8,
        repsMax: item.repsMax ?? 12,
        pesoObjetivoKg: item.pesoKg ?? null,
        rirObjetivo: item.rir ?? null,
        descansoSeg: 90,
        nota: null,
      });
    }
    dias.push({ diaSemana: dia.diaSemana, nombre: dia.nombre ?? null, ejercicios });
  }
  const respuesta = await api<RutinaCreada>('POST', '/routines', {
    nombre: semilla.nombre,
    descripcion: semilla.descripcion ?? null,
    objetivo: semilla.objetivo === undefined ? 'HIPERTROFIA' : semilla.objetivo,
    visibilidad: 'PRIVATE',
    duracionSemanas: semilla.duracionSemanas ?? 12,
    progresion: { activa: true, descargaCada: semilla.descargaCada === undefined ? 4 : semilla.descargaCada },
    dias,
  });
  if (respuesta.status !== 201) {
    throw new Error(`La rutina «${semilla.nombre}» no se creó (${respuesta.status}): ${JSON.stringify(respuesta.data)}`);
  }
  return respuesta.data;
}

export async function publicarRutina(api: Api, id: string) {
  const respuesta = await api('POST', `/routines/${id}/publish`);
  if (respuesta.status >= 300) throw new Error(`No se publicó la rutina (${respuesta.status}).`);
  return respuesta.data;
}

const entero = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

/** Series y repeticiones plausibles al azar. Con `ejercicioAlAzar` da una huella que ninguna otra ejecución repite. */
export function huellaPropia(): { series: number; repsMin: number; repsMax: number } {
  const repsMin = entero(5, 12);
  return { series: entero(3, 5), repsMin, repsMax: repsMin + entero(0, 4) };
}

/** Ejercicios del catálogo local con los que se varían las rutinas sembradas. */
const POOL_EJERCICIOS = [
  'barbell lunge',
  'barbell romanian deadlift',
  'barbell close-grip bench press',
  'barbell seated overhead press',
  'dumbbell standing overhead press',
  'dumbbell romanian deadlift',
  'assisted pull-up',
  'reverse grip machine lat pulldown',
  'twin handle parallel grip lat pulldown',
  'band stiff leg deadlift',
  'barbell one arm side deadlift',
  'dumbbell standing alternate overhead press',
];

/** `n` ejercicios distintos del pool, sin los de `excluir`. */
export function ejerciciosAlAzar(n: number, excluir: readonly string[] = []): string[] {
  const libres = POOL_EJERCICIOS.filter((nombre) => !excluir.includes(nombre));
  const elegidos: string[] = [];
  while (elegidos.length < n && libres.length > 0) {
    elegidos.push(libres.splice(entero(0, libres.length - 1), 1)[0]!);
  }
  return elegidos;
}

export function ejercicioAlAzar(excluir: readonly string[] = []): string {
  return ejerciciosAlAzar(1, excluir)[0]!;
}

/**
 * Empuje/tirón/pierna de cuatro días, la rutina de referencia de casi todas las
 * capturas. Cada llamada da una rutina con HUELLA PROPIA (series y repeticiones del
 * primer ejercicio al azar): la base es compartida y dos idénticas no se pueden
 * publicar (D1), así que repetir una semilla entre ejecuciones daría un 409.
 * Para dos rutinas idénticas a propósito, se copia el objeto: `{ ...semilla, nombre }`.
 */
export function empujeCuatroDias(nombre: string, extra: Partial<RutinaSemilla> = {}): RutinaSemilla {
  const propia = huellaPropia();
  return {
    nombre,
    descripcion: 'Cuatro días: empuje, tirón, pierna y torso. Semana base con descarga cada cuatro.',
    objetivo: 'HIPERTROFIA',
    duracionSemanas: 12,
    dias: [
      {
        diaSemana: 1,
        nombre: 'Empuje',
        ejercicios: [
          {
            nombre: 'barbell bench press',
            ...propia,
            pesoKg: 60,
          },
          { nombre: 'barbell seated overhead press', repsMin: 8, repsMax: 10 },
        ],
      },
      {
        diaSemana: 2,
        nombre: 'Tirón',
        ejercicios: [
          { nombre: 'barbell deadlift', series: 3, repsMin: 5, repsMax: 5, pesoKg: 90 },
          { nombre: 'cable lat pulldown full range of motion', repsMin: 8, repsMax: 12 },
        ],
      },
      {
        diaSemana: 4,
        nombre: 'Pierna',
        ejercicios: [
          { nombre: ejercicioAlAzar(['barbell romanian deadlift']), ...huellaPropia() },
          { nombre: 'barbell romanian deadlift', repsMin: 8, repsMax: 10 },
        ],
      },
      {
        diaSemana: 5,
        nombre: 'Torso',
        ejercicios: ejerciciosAlAzar(2).map((nombre) => ({ nombre, ...huellaPropia() })),
      },
    ],
    ...extra,
  };
}

/**
 * Promueve una cuenta a `SYSTEM_ADMIN` directamente en la base (no hay otra forma
 * de crear uno) y vuelve a iniciar sesión para que el token lleve el rol nuevo.
 * Solo para la base desechable de pruebas.
 */
export async function promoverASistema(cuenta: Cuenta): Promise<Cuenta> {
  await sql(`UPDATE public.usuarios SET rol='SYSTEM_ADMIN' WHERE id='${cuenta.id}'`);
  const login = await llamar<{ accessToken: string }>('POST', '/auth/login', {
    email: cuenta.email,
    password: cuenta.password,
  });
  return { ...cuenta, token: login.data.accessToken };
}

/** Una sentencia SQL contra la base desechable de pruebas (preparar estados que la API no deja crear). */
export async function sql(sentencia: string): Promise<void> {
  const { execFileSync } = await import('node:child_process');
  execFileSync(
    'psql',
    [
      '-h',
      process.env.E2E_PGHOST ?? 'localhost',
      '-p',
      process.env.E2E_PGPORT ?? '5433',
      '-U',
      process.env.E2E_PGUSER ?? 'postgres',
      process.env.E2E_PGDATABASE ?? 'gym_sheet',
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      sentencia,
    ],
    { env: { ...process.env, PGPASSWORD: process.env.E2E_PGPASSWORD ?? 'postgres' }, stdio: 'ignore' },
  );
}


/** Etiqueta única por ejecución, para filtrar el catálogo y no mezclar con lo que dejaron otras pruebas. */
export function etiquetaUnica(): string {
  return `T${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 4)}`;
}

type DetalleRutina = {
  dias: Array<{
    diaSemana: number | null;
    nombre: string | null;
    ejercicios: Array<{
      seriesObjetivo: number;
      repsMin: number | null;
      repsMax: number | null;
      pesoObjetivoKg: number | null;
      rirObjetivo: number | null;
      descansoSeg: number | null;
      nota: string | null;
      ejercicio: { id: string } | null;
    }>;
  }>;
};

/**
 * Reescribe la estructura de una rutina propia (`PUT /routines/:id/structure`)
 * partiendo de la actual y aplicando `cambiar` sobre el cuerpo. Sirve para editar
 * una pública (sube su versión) o para variar una copia.
 */
export async function editarEstructura(
  api: Api,
  id: string,
  cambiar: (dias: Array<{ diaSemana: number | null; nombre: string | null; ejercicios: Array<Record<string, unknown>> }>) => void,
) {
  const actual = await api<DetalleRutina>('GET', `/routines/${id}`);
  const dias = actual.data.dias.map((dia) => ({
    diaSemana: dia.diaSemana,
    nombre: dia.nombre,
    ejercicios: dia.ejercicios.map((item) => ({
      ejercicioId: item.ejercicio?.id,
      seriesObjetivo: item.seriesObjetivo,
      repsMin: item.repsMin,
      repsMax: item.repsMax,
      pesoObjetivoKg: item.pesoObjetivoKg,
      rirObjetivo: item.rirObjetivo,
      descansoSeg: item.descansoSeg,
      nota: item.nota,
    })),
  }));
  cambiar(dias);
  const respuesta = await api('PUT', `/routines/${id}/structure`, { dias });
  if (respuesta.status >= 300) throw new Error(`No se editó la estructura (${respuesta.status}).`);
  return respuesta.data;
}

/** Un ejercicio personal (privado) de quien llama. */
export async function crearEjercicioPersonal(api: Api, nombre: string): Promise<{ id: string; nombre: string }> {
  const respuesta = await api<{ id: string; nombre: string }>('POST', '/exercises/personal', {
    nombre,
    grupoMuscular: 'chest',
    descripcion: 'Un ejercicio inventado por quien hizo la rutina.',
  });
  if (respuesta.status !== 201) throw new Error(`No se creó el ejercicio personal (${respuesta.status}).`);
  return respuesta.data;
}

export type SerieSemilla = { ejercicioId: string; reps: number; pesoKg: number; rir?: number };

type SesionIniciada = {
  id: string;
  ejercicios: Array<{ id: string; ejercicio: { id: string } | null; series: unknown[] }>;
};

/**
 * Empieza una sesión desde un día de la rutina, anota las series y la deja con 30
 * minutos de duración (el programa exige al menos 10 y 3 series para que cuente).
 * No la termina: eso lo hace la prueba, por pantalla o con `terminarSesion`.
 */
export async function sesionConSeries(
  api: Api,
  rutinaId: string,
  diaId: string,
  series: readonly SerieSemilla[],
): Promise<string> {
  const inicio = await api<SesionIniciada>('POST', `/routines/${rutinaId}/start`, { routineDayId: diaId });
  if (inicio.status !== 201) throw new Error(`No se inició la sesión (${inicio.status}).`);
  const numero = new Map<string, number>();
  for (const serie of series) {
    const item = inicio.data.ejercicios.find((candidate) => candidate.ejercicio?.id === serie.ejercicioId);
    if (!item) throw new Error('El ejercicio no está en la sesión.');
    const n = (numero.get(item.id) ?? 0) + 1;
    numero.set(item.id, n);
    const respuesta = await api('POST', `/workouts/session-exercises/${item.id}/sets`, {
      tipoSerie: 'FUERZA',
      numeroSerie: n,
      repeticiones: serie.reps,
      pesoKg: serie.pesoKg,
      rir: serie.rir ?? 2,
      descansoSegAnterior: 90,
    });
    if (respuesta.status >= 300) throw new Error(`No se anotó la serie (${respuesta.status}).`);
  }
  await sql(`UPDATE public.sesiones_entrenamiento SET fecha_inicio = now() - interval '30 minutes' WHERE id='${inicio.data.id}'`);
  return inicio.data.id;
}

export async function terminarSesion<T = unknown>(api: Api, sesionId: string): Promise<Respuesta<T>> {
  return api<T>('PATCH', `/workouts/${sesionId}/finish`, {});
}

/** Los días de una rutina creada, con el id de cada día y el id del ejercicio de cada fila. */
export async function diasDe(api: Api, rutinaId: string) {
  const detalle = await api<{
    dias: Array<{ id: string; diaSemana: number | null; ejercicios: Array<{ id: string; ejercicio: { id: string; nombre: string } | null }> }>;
  }>('GET', `/routines/${rutinaId}`);
  return detalle.data.dias;
}

/** Una sesión de cardio completa por API (sesión, serie CARDIO y cierre). Devuelve la respuesta de `finish`. */
export async function sesionDeCardio<T = unknown>(
  api: Api,
  ejercicioDeCardioId: string,
  serie: { minutos: number; fcMedia?: number; rpe?: number; distanciaM?: number },
): Promise<Respuesta<T>> {
  const sesion = await api<{ id: string }>('POST', '/workouts', { observacion: 'Cardio de prueba' });
  const fila = await api<{ id: string }>('POST', `/workouts/${sesion.data.id}/exercises`, { ejercicioId: ejercicioDeCardioId, orden: 1 });
  const guardada = await api('POST', `/workouts/session-exercises/${fila.data.id}/sets`, {
    tipoSerie: 'CARDIO',
    numeroSerie: 1,
    duracionSeg: serie.minutos * 60,
    ...(serie.fcMedia ? { fcMedia: serie.fcMedia } : {}),
    ...(serie.rpe ? { rpe: serie.rpe } : {}),
    ...(serie.distanciaM ? { distanciaM: serie.distanciaM } : {}),
    descansoSegAnterior: 0,
  });
  if (guardada.status >= 300) throw new Error(`No se anotó la serie de cardio (${guardada.status}).`);
  return terminarSesion<T>(api, sesion.data.id);
}

/**
 * Inicia sesión como el administrador de gimnasio sembrado (`admin@gymsheet.local`). Sirve para
 * las herramientas de soporte (`recompute-week`) y la cola de moderación.
 */
export async function adminDeGimnasio(): Promise<Api> {
  const login = await llamar<{ accessToken: string }>('POST', '/auth/login', {
    email: process.env.E2E_ADMIN_EMAIL ?? 'admin@gymsheet.local',
    password: process.env.E2E_ADMIN_PASSWORD ?? 'AdminLocal2026!',
  });
  return apiDe({ token: login.data.accessToken });
}
