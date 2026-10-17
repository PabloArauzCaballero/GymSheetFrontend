export const MIN_PROFILE_AGE = 12;
export const MAX_PROFILE_AGE = 100;

/** The three fields a birth date is typed into: day, month and year. */
export const BIRTH_DATE_PARTS = [
  { key: 'dia', label: 'Día', placeholder: '15', maxLength: 2, flex: 1 },
  { key: 'mes', label: 'Mes', placeholder: '03', maxLength: 2, flex: 1 },
  { key: 'anio', label: 'Año', placeholder: '1996', maxLength: 4, flex: 1.6 },
] as const;

export type BirthDateParts = { dia: string; mes: string; anio: string };

/** Whole years between a local calendar date and today. */
export function ageOn(year: number, month: number, day: number, today = new Date()): number {
  let age = today.getFullYear() - year;
  if (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)) {
    age -= 1;
  }
  return age;
}

/**
 * Why a day/month/year triple is not a usable birth date, or `null` if it is
 * (all three empty counts as usable: the field is optional).
 *
 * Built from local calendar parts, not `new Date('1996-03-15')`, which is
 * parsed as UTC and can land on the previous day west of Greenwich.
 */
export function birthDateError(dia: string, mes: string, anio: string): string | null {
  if (dia === '' && mes === '' && anio === '') return null;
  if (dia === '' || mes === '' || anio === '') return 'Completa día, mes y año.';
  if (![dia, mes, anio].every((part) => /^\d+$/.test(part))) return 'Usa solo números.';
  if (anio.length !== 4) return 'Escribe el año con cuatro cifras, por ejemplo 1996.';
  const day = Number(dia);
  const month = Number(mes);
  const year = Number(anio);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return 'Esa fecha no existe.';
  }
  if (date > new Date()) return 'La fecha no puede ser futura.';
  const age = ageOn(year, month, day);
  if (age < MIN_PROFILE_AGE || age > MAX_PROFILE_AGE) {
    return `Debes tener entre ${MIN_PROFILE_AGE} y ${MAX_PROFILE_AGE} años.`;
  }
  return null;
}

/** Day/month/year → `1996-03-15`, the shape the API stores. */
export function toIsoBirthDate({ dia, mes, anio }: BirthDateParts): string {
  return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
}
