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

/** What the user types, digits only, shaped as `dd/mm/aaaa` while typing (P2-13: never the browser's mm/dd). */
export function maskBirthDate(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
}

/** `1996-03-15` → `15/03/1996`. */
export function displayFromIso(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

/** `15/03/1996` → `1996-03-15`; anything incomplete is handed on as typed, so the schema says what is wrong. */
export function isoFromDisplay(text: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : text;
}

/** '' or `YYYY-MM-DD` of a real past day. Empty is valid: the date is optional. */
export const birthDateInputSchema = z.string().superRefine((value, ctx) => {
  if (value === '') return;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return ctx.addIssue({ code: 'custom', message: 'Escribe la fecha como dd/mm/aaaa.' });
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return ctx.addIssue({ code: 'custom', message: 'Esa fecha no existe.' });
  }
  const age = ageFromBirthDate(value);
  if (age < MIN_AGE || age > MAX_AGE) ctx.addIssue({ code: 'custom', message: `Debes tener entre ${MIN_AGE} y ${MAX_AGE} años.` });
});

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
