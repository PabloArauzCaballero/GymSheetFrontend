/**
 * Texto del buscador: la misma normalización que hace el servidor (sin acentos
 * ni mayúsculas), para poder resaltar en el nombre lo que la persona escribió.
 * Sin dependencias: se prueba con `node --test`.
 */

/** «Bíceps» → «biceps». Conserva la longitud, así los índices valen para el original. */
export function normalizeSearch(text: string): string {
  let out = '';
  for (const char of text) {
    const base = char.normalize('NFD').replace(/[̀-ͯ]/g, '');
    // Una letra que al descomponerse cambia de longitud (ß, ligaduras) se deja
    // tal cual: lo que importa aquí es que los índices sigan coincidiendo.
    out += base.length === char.length ? base.toLowerCase() : char.toLowerCase();
  }
  return out;
}

export type TextPart = { text: string; match: boolean };

/**
 * Parte `name` en trozos, marcando los que coinciden con alguna palabra de la
 * consulta (por el principio de palabra, como busca el servidor). Si nada
 * coincide —la consulta llegó por un sinónimo o una errata corregida— devuelve
 * el nombre entero sin marcar.
 */
export function highlightParts(name: string, query: string): TextPart[] {
  const tokens = normalizeSearch(query)
    .split(/[^a-z0-9ñ]+/)
    .filter((token) => token.length >= 2);
  if (tokens.length === 0 || name.length === 0) return [{ text: name, match: false }];

  const haystack = normalizeSearch(name);
  const marked = new Array<boolean>(name.length).fill(false);
  for (const token of tokens) {
    let from = 0;
    for (;;) {
      const at = haystack.indexOf(token, from);
      if (at === -1) break;
      const startsWord = at === 0 || !/[a-z0-9ñ]/.test(haystack[at - 1] ?? '');
      if (startsWord) for (let i = at; i < at + token.length; i += 1) marked[i] = true;
      from = at + token.length;
    }
  }

  const parts: TextPart[] = [];
  let start = 0;
  for (let i = 1; i <= name.length; i += 1) {
    if (i === name.length || marked[i] !== marked[start]) {
      parts.push({ text: name.slice(start, i), match: marked[start] === true });
      start = i;
    }
  }
  return parts;
}

/** «Sentadilla con barra» a partir de lo que mande el servidor. */
export function displayName(exercise: { nombre: string; nombreEs?: string | null }): string {
  const name = exercise.nombreEs?.trim() || exercise.nombre;
  // El catálogo en inglés llega en minúsculas («barbell squat»).
  return name.charAt(0).toLocaleUpperCase('es') + name.slice(1);
}

export type SearchFilters = { musculo: string | null; equipo: string | null; conImagen: boolean; favoritos: boolean };

export const NO_FILTERS: SearchFilters = { musculo: null, equipo: null, conImagen: false, favoritos: false };

export function activeFilterCount(filters: SearchFilters): number {
  return (
    (filters.musculo ? 1 : 0) + (filters.equipo ? 1 : 0) + (filters.conImagen ? 1 : 0) + (filters.favoritos ? 1 : 0)
  );
}

/** «128 ejercicios», «1 ejercicio», «Sin resultados». */
export function resultCountLabel(total: number): string {
  if (total === 0) return 'Sin resultados';
  return `${total.toLocaleString('es')} ${total === 1 ? 'ejercicio' : 'ejercicios'}`;
}
