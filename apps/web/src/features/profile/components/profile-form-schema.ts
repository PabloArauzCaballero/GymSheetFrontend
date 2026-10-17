import { z } from 'zod';
import * as birthDate from '@/features/profile/lib/birth-date';
import { trainingGoals } from '@/shared/api/contracts';

export const profileFormSchema = z.object({
  fechaNacimiento: birthDate.birthDateInputSchema,
  pesoKg: z.number().min(1).max(400),
  estaturaCm: z.number().int().min(80).max(250),
  objetivo: z.enum(trainingGoals),
});
export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const goalLabels: Record<ProfileFormValues['objetivo'], string> = {
  HIPERTROFIA: 'Hipertrofia',
  FUERZA: 'Fuerza',
  RESISTENCIA: 'Resistencia',
  PERDIDA_GRASA: 'Pérdida de grasa',
  SALUD_GENERAL: 'Salud general',
  RENDIMIENTO_DEPORTIVO: 'Rendimiento deportivo',
  REHABILITACION: 'Rehabilitación',
};
