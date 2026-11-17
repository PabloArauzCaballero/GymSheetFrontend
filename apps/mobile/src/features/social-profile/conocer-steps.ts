import type { Ionicons } from '@expo/vector-icons';

export type ConocerStepKey = 'search' | 'interests' | 'habits' | 'orientation' | 'bio' | 'photos';

export type ConocerStep = {
  key: ConocerStepKey;
  /** Under the progress rail: one short word. */
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subline: string;
};

/** The optional "Conocer" step, in order. Every question can be left empty. */
export const CONOCER_STEPS: readonly ConocerStep[] = [
  {
    key: 'search',
    label: 'Busco',
    icon: 'compass-outline',
    title: '¿Qué buscas?',
    subline: 'Elige qué quieres y a quién ver. Puedes cambiarlo cuando quieras.',
  },
  {
    key: 'interests',
    label: 'Gustos',
    icon: 'sparkles-outline',
    title: 'Elige tus intereses',
    subline: 'Hasta 5. Salen en tu tarjeta para romper el hielo.',
  },
  {
    key: 'habits',
    label: 'Hábitos',
    icon: 'cafe-outline',
    title: 'Cuéntanos tus hábitos',
    subline: 'Responde solo lo que quieras compartir.',
  },
  {
    key: 'orientation',
    label: 'Identidad',
    icon: 'person-outline',
    title: 'Tu orientación',
    subline: 'Es opcional y queda oculta salvo que la muestres.',
  },
  {
    key: 'bio',
    label: 'Bio',
    icon: 'create-outline',
    title: 'Escribe tu bio',
    subline: 'Unas líneas sobre ti. Sin enlaces ni teléfonos.',
  },
  {
    key: 'photos',
    label: 'Fotos',
    icon: 'images-outline',
    title: 'Sube tus fotos',
    subline: 'Con 2 fotos ya apareces en Conocer.',
  },
];

const FIRST_STEP: ConocerStep = CONOCER_STEPS[0] as ConocerStep;

export function stepAt(index: number): ConocerStep {
  return CONOCER_STEPS[index] ?? FIRST_STEP;
}

/** Index of a step, clamped: deep links (`?paso=fotos`) must never open a missing step. */
export function stepIndexOf(key: string | undefined): number {
  const index = CONOCER_STEPS.findIndex((step) => step.key === key);
  return index < 0 ? 0 : index;
}
