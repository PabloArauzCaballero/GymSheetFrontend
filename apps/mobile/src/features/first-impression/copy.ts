import type { Ionicons } from '@expo/vector-icons';

/** Titular y subtítulo de la primera pantalla: viven en `@gymsheet/domain`, compartidos con la web. */
export { valuePitch } from '@gymsheet/domain';

export type Benefit = { icon: keyof typeof Ionicons.glyphMap; label: string };

/** Lo que se lleva quien se registra: tres filas de 4–6 palabras. */
export const registerBenefits: readonly Benefit[] = [
  { icon: 'barbell-outline', label: 'Rutinas guiadas, serie a serie' },
  { icon: 'people-outline', label: 'Entrena y chatea con tu gente' },
  { icon: 'trophy-outline', label: 'Rachas, insignias y cartas de premio' },
];

/** Encabezado del formulario de alta (el de acceso sigue en `authCopy`). */
export const registerFormTitle = 'Crea tu cuenta';

/** Preguntas del onboarding y cierre: viven en `@gymsheet/domain`, compartidos con la web. */
export { onboardingFinish, onboardingSteps } from '@gymsheet/domain';

export const onboardingDone = 'Ya está. Elige tu primera rutina en Inicio.';
export const onboardingFinishCta = 'Completar y empezar';
