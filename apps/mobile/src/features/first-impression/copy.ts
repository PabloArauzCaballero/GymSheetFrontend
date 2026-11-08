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

/**
 * Una pregunta por paso del onboarding: es el protagonista de cada pantalla.
 * El último paso celebra y apunta al primer entreno.
 */
export const onboardingSteps = [
  {
    title: '¿Qué quieres conseguir?',
    subline: 'Elige uno. Con él te recomendamos rutinas.',
  },
  {
    title: '¿Cuánto pesas y mides?',
    subline: 'Lo guardamos como tu primera medida. Lo cambias cuando quieras.',
  },
  {
    title: '¿Cómo entrenas?',
    subline: 'Tu nivel, tus días y dónde lo haces.',
  },
] as const;

export function onboardingFinish(firstName: string, atGym: boolean) {
  return {
    title: `Ya está, ${firstName}.`,
    subline: atGym
      ? 'Tu perfil está listo. Completa y elige la rutina de tu primer entreno.'
      : 'Marca tu material, completa y elige la rutina de tu primer entreno.',
  };
}

export const onboardingDone = 'Ya está. Elige tu primera rutina en Inicio.';
export const onboardingFinishCta = 'Completar y empezar';
