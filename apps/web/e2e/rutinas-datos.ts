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
        ejercicioId: await ejercicioId(api, item.nombre),
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

/** Series y repeticiones al azar: lo que da a una rutina una huella que ninguna otra ejecución repite. */
export function huellaPropia(): { series: number; repsMin: number; repsMax: number } {
  const repsMin = entero(1, 400);
  return { series: entero(1, 99), repsMin, repsMax: repsMin + entero(0, 500) };
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
          { nombre: 'barbell lunge', repsMin: 8, repsMax: 10 },
          { nombre: 'barbell romanian deadlift', repsMin: 8, repsMax: 10 },
        ],
      },
      {
        diaSemana: 5,
        nombre: 'Torso',
        ejercicios: [{ nombre: 'barbell close-grip bench press', repsMin: 8, repsMax: 10 }],
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
      '-c',
      `UPDATE public.usuarios SET rol='SYSTEM_ADMIN' WHERE id='${cuenta.id}'`,
    ],
    { env: { ...process.env, PGPASSWORD: process.env.E2E_PGPASSWORD ?? 'postgres' }, stdio: 'ignore' },
  );
  const login = await llamar<{ accessToken: string }>('POST', '/auth/login', {
    email: cuenta.email,
    password: cuenta.password,
  });
  return { ...cuenta, token: login.data.accessToken };
}

/** Etiqueta única por ejecución, para filtrar el catálogo y no mezclar con lo que dejaron otras pruebas. */
export function etiquetaUnica(): string {
  return `T${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 4)}`;
}
