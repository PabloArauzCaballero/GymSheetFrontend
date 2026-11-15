import { z } from 'zod';
import { trainingGoals } from '@gymsheet/types';
import type { FlowStep } from '@/components/step-flow';
import { birthDateError, toIsoBirthDate } from '@/lib/birth-date';

/**
 * A numeric keypad offers both separators depending on the locale, and a user
 * typing their weight will use whichever their phone shows — so `72,5` and
 * `72.5` have to mean the same number.
 */
function toNumber(value: string): number {
  return Number(value.replace(',', '.'));
}

/** `1996-03-15` → the three fields the form edits. */
export function splitBirthDate(isoDate: string | null | undefined) {
  const [anio = '', mes = '', dia = ''] = isoDate ? isoDate.split('-') : [];
  return { dia, mes, anio };
}

/**
 * The form speaks strings (that is what a `TextInput` produces) and parses to
 * the numbers the API expects, so `z.input` is the shape bound to the fields and
 * `z.output` the payload sent to the backend.
 *
 * Ranges mirror the backend (`upsertProfileSchema`: 1–400 kg, 80–250 cm). The
 * height used to allow 260 here, so 251–260 passed the form and came back as a
 * 400 from the server; the weight floor stays at 20 to catch a missed digit.
 */
export const profileFormSchema = z.object({
  pesoKg: z
    .string()
    .trim()
    .min(1, 'Ingresa tu peso.')
    .transform(toNumber)
    .refine((value) => Number.isFinite(value), 'Usa solo números, por ejemplo 72,5.')
    .refine((value) => value >= 20 && value <= 400, 'El peso debe estar entre 20 y 400 kg.'),
  estaturaCm: z
    .string()
    .trim()
    .min(1, 'Ingresa tu estatura.')
    .transform(toNumber)
    .refine((value) => Number.isInteger(value), 'Usa centímetros enteros, por ejemplo 178.')
    .refine((value) => value >= 80 && value <= 250, 'La estatura debe estar entre 80 y 250 cm.'),
  // Optional: three empty fields are "no lo digo", not an error, and travel as null.
  fechaNacimiento: z
    .object({ dia: z.string().trim(), mes: z.string().trim(), anio: z.string().trim() })
    .superRefine(({ dia, mes, anio }, ctx) => {
      const message = birthDateError(dia, mes, anio);
      if (message) ctx.addIssue({ code: 'custom', message });
    })
    .transform((parts) =>
      parts.dia === '' && parts.mes === '' && parts.anio === '' ? null : toIsoBirthDate(parts),
    ),
  objetivo: z.enum(trainingGoals),
});

export type ProfileFormValues = z.input<typeof profileFormSchema>;
export type ProfileFormPayload = z.output<typeof profileFormSchema>;

/**
 * The four questions, asked one at a time: as a single long form this was a
 * wall of inputs; one question per screen costs no extra taps and has a
 * visible end, which the rail at the top shows.
 */
export const PROFILE_STEPS: readonly FlowStep[] = [
  { label: 'Peso', icon: 'barbell-outline' },
  { label: 'Estatura', icon: 'resize-outline' },
  { label: 'Nacimiento', icon: 'calendar-outline' },
  { label: 'Objetivo', icon: 'flag-outline' },
];

/** The field validated before each step is allowed to advance. */
export const STEP_FIELD = ['pesoKg', 'estaturaCm', 'fechaNacimiento', 'objetivo'] as const;
