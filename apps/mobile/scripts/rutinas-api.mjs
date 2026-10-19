// Ayudante de API para sembrar y preparar datos de la evidencia de Rutinas REPP.
// Uso como biblioteca desde `seed-rutinas-evidencia.mjs`. Requiere Node >= 20.
const BASE = process.env.API_URL ?? 'http://localhost:3011/api/v1';
export const PASSWORD = process.env.QA_PASSWORD ?? 'MockLocal2026!';

export async function call(token, method, path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, data: json.data ?? json, error: json };
}

export async function login(email, password = PASSWORD) {
  const { status, data } = await call(null, 'POST', '/auth/login', { email, password });
  if (status >= 300) throw new Error(`login ${email}: ${status} ${JSON.stringify(data)}`);
  return { token: data.accessToken, user: data.user };
}

/** Primer ejercicio que coincide con la búsqueda. */
export async function exerciseId(token, search) {
  const { data } = await call(token, 'GET', `/exercises?search=${encodeURIComponent(search)}&pageSize=1`);
  const found = data.items?.[0];
  if (!found) throw new Error(`Ejercicio no encontrado: ${search}`);
  return found.id;
}

export const day = (diaSemana, nombre, ejercicios) => ({ diaSemana, nombre, ejercicios });
export const ex = (ejercicioId, seriesObjetivo = 3, repsMin = 8, repsMax = 12, pesoObjetivoKg = null) => ({
  ejercicioId, seriesObjetivo, repsMin, repsMax, pesoObjetivoKg, rirObjetivo: 2, descansoSeg: 90, nota: null,
});

/** Crea una rutina por días (si no existe una mía con ese nombre) y devuelve su id. */
export async function ensureRoutine(token, userId, input) {
  const mine = await call(token, 'GET', '/routines?scope=mine&limit=50');
  const existing = mine.data.items?.find((r) => r.nombre === input.nombre && r.esMia);
  if (existing) return existing.id;
  const created = await call(token, 'POST', '/routines', {
    descripcion: null, visibilidad: 'PRIVATE', progresion: { activa: true, descargaCada: 4 }, ...input,
  });
  if (created.status >= 300) throw new Error(`crear ${input.nombre}: ${JSON.stringify(created.error)}`);
  return created.data.id;
}
