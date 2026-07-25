import { z } from 'zod';

export const exerciseFormSchema = z.object({
  nombre: z.string().trim().min(2, 'Usa al menos 2 caracteres.').max(160),
  grupoMuscular: z.string().trim().min(2, 'Especifica el grupo muscular.').max(120),
  descripcion: z.string().trim().max(2000).optional(),
  bodyPart: z.string().trim().max(100).optional(),
  targetMuscle: z.string().trim().max(120).optional(),
  synergistMuscleGroup: z.string().trim().max(120).optional(),
  secondaryMusclesText: z.string().max(1500).optional(),
  instructionsText: z.string().max(6000).optional(),
  stepsText: z.string().max(8000).optional(),
  equipoIds: z.array(z.string().uuid()).max(30),
});

export type ExerciseFormValues = z.infer<typeof exerciseFormSchema>;

export const emptyExerciseFormValues: ExerciseFormValues = {
  nombre: '',
  grupoMuscular: '',
  descripcion: '',
  bodyPart: '',
  targetMuscle: '',
  synergistMuscleGroup: '',
  secondaryMusclesText: '',
  instructionsText: '',
  stepsText: '',
  equipoIds: [],
};

/** Trims a value and returns null when empty, matching the backend contract. */
export function cleanOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
