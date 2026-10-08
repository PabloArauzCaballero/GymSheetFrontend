import { z } from 'zod';
import {
  MAX_WEEKS,
  WIZARD_STEPS,
  durationInWeeks,
  type RoutineDraft,
  type WizardStepId,
} from './model';

/** Errores de un paso por campo: lo que cada pantalla pinta bajo su control. */
export type StepErrors = Partial<Record<'nombre' | 'descripcion' | 'duracion' | 'dias', string>>;

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Escribe un nombre')
  .min(3, 'Usa al menos 3 caracteres')
  .max(160, 'El nombre admite hasta 160 caracteres');

const descriptionSchema = z
  .string()
  .trim()
  .max(1000, 'La descripción admite hasta 1000 caracteres');

const durationSchema = z
  .number()
  .int('Indica una cantidad entera')
  .min(1, 'La duración mínima es 1')
  .max(MAX_WEEKS, `La duración máxima es ${MAX_WEEKS} semanas`);

function firstMessage(result: z.ZodSafeParseResult<unknown>): string | undefined {
  return result.success ? undefined : result.error.issues[0]?.message;
}

/** Valida un paso del asistente. Devuelve `{}` cuando se puede avanzar. */
export function validateStep(draft: RoutineDraft, step: WizardStepId): StepErrors {
  const errors: StepErrors = {};
  switch (step) {
    case 'nombre': {
      const message = firstMessage(nameSchema.safeParse(draft.nombre));
      if (message) errors.nombre = message;
      break;
    }
    case 'descripcion': {
      const message = firstMessage(descriptionSchema.safeParse(draft.descripcion));
      if (message) errors.descripcion = message;
      break;
    }
    case 'duracion': {
      const message = firstMessage(durationSchema.safeParse(durationInWeeks(draft.duracion)));
      if (message) errors.duracion = message;
      break;
    }
    case 'dias':
      if (draft.dias.length === 0) errors.dias = 'Elige al menos un día';
      break;
    case 'objetivo':
    case 'revision':
      break;
  }
  return errors;
}

export function stepIdAt(index: number): WizardStepId {
  const step = WIZARD_STEPS[Math.min(Math.max(index, 0), WIZARD_STEPS.length - 1)];
  // El índice se acota arriba: `step` nunca es undefined, pero el tipo no lo sabe.
  return (step ?? WIZARD_STEPS[0]).id;
}

export function canAdvance(draft: RoutineDraft, index: number): boolean {
  return Object.keys(validateStep(draft, stepIdAt(index))).length === 0;
}

/** Primer paso (base 0) con errores, o `null` si todos están bien. Sirve al guardar y al retomar. */
export function firstInvalidStep(draft: RoutineDraft): number | null {
  for (let index = 0; index < WIZARD_STEPS.length; index += 1) {
    if (!canAdvance(draft, index)) return index;
  }
  return null;
}

/** «Paso 2 de 6 · Descripción». */
export function progressLabel(index: number): string {
  const step = WIZARD_STEPS[index] ?? WIZARD_STEPS[0];
  return `Paso ${index + 1} de ${WIZARD_STEPS.length} · ${step.titulo}`;
}
