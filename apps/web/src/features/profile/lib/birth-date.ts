import { z } from 'zod';

export const MIN_AGE = 12;
export const MAX_AGE = 100;

/** Años cumplidos a partir de `YYYY-MM-DD`, contados en calendario local. */
export function ageFromBirthDate(isoDate: string, today = new Date()): number {
  const [year = 0, month = 0, day = 0] = isoDate.split('-').map(Number);
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) {
    age -= 1;
  }
  return age;
}

/** `YYYY-MM-DD` de hoy menos `years` años, para los límites del selector de fecha. */
export function isoYearsAgo(years: number, today = new Date()): string {
  const date = new Date(today.getFullYear() - years, today.getMonth(), today.getDate());
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** `<input type="date">` entrega '' o `YYYY-MM-DD`. Vacío es válido: la fecha es opcional. */
export const birthDateInputSchema = z.string().refine((value) => {
  if (value === '') return true;
  const age = ageFromBirthDate(value);
  return age >= MIN_AGE && age <= MAX_AGE;
}, `Debes tener entre ${MIN_AGE} y ${MAX_AGE} años.`);

/**
 * Qué enviar como `fechaNacimiento`. Vacío solo borra una fecha que ya existía;
 * si nunca la hubo se omite, y la edad que guardó una versión anterior no se
 * pierde al editar el peso.
 */
export function birthDatePayload(
  value: string,
  hadBirthDate: boolean,
): { fechaNacimiento?: string | null } {
  if (value) return { fechaNacimiento: value };
  return hadBirthDate ? { fechaNacimiento: null } : {};
}
