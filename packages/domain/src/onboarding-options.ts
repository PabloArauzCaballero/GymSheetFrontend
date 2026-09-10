import type { FitnessGoal } from '@gymsheet/types';

/**
 * Copy y opciones del onboarding, compartidas entre web y móvil.
 *
 * Ambas plataformas hacen la misma pregunta con las mismas palabras — vive
 * aquí para que cambiar una opción no signifique cambiarla dos veces y que
 * un día se desincronicen.
 */
export const goalOptions: { value: FitnessGoal; label: string; description: string }[] = [
  {
    value: 'GAIN_MUSCLE',
    label: 'Ganar músculo',
    description: 'Aumentar masa muscular progresivamente.',
  },
  { value: 'LOSE_FAT', label: 'Perder grasa', description: 'Mejorar composición corporal.' },
  {
    value: 'IMPROVE_STRENGTH',
    label: 'Mejorar fuerza',
    description: 'Priorizar levantamientos y progresión.',
  },
  {
    value: 'IMPROVE_ENDURANCE',
    label: 'Mejorar resistencia',
    description: 'Sostener esfuerzos durante más tiempo.',
  },
  {
    value: 'MAINTAIN_FITNESS',
    label: 'Mantener condición',
    description: 'Conservar tu nivel físico actual.',
  },
  {
    value: 'GENERAL_HEALTH',
    label: 'Salud general',
    description: 'Construir hábitos activos y sostenibles.',
  },
  {
    value: 'SPORT_PERFORMANCE',
    label: 'Rendimiento deportivo',
    description: 'Complementar la práctica de tu deporte.',
  },
];

export const equipmentOptions = [
  'Mancuernas',
  'Barra y discos',
  'Máquinas',
  'Bandas',
  'Poleas',
  'Banco',
  'Peso corporal',
];

export const preferenceOptions = [
  'Fuerza',
  'Hipertrofia',
  'Cardio',
  'Movilidad',
  'Entrenamiento funcional',
];
