import type { Ionicons } from '@expo/vector-icons';

/**
 * Lo que dice la primera pantalla a quien llega desde la App Store (#124 ASO:
 * continuidad entre la ficha y lo primero que se ve). Una frase dice qué es la
 * app; la segunda, qué se hace en ella. Sin cifras: no hay ninguna real que dar
 * todavía, y una inventada se nota.
 *
 * El nombre del gimnasio no aparece en el titular: lo pone el logotipo justo
 * encima, y así el texto sirve igual para los gimnasios con marca propia.
 */
export const valuePitch = {
  headline: 'La red social de tu gimnasio.',
  subline: 'Entrena guiado serie a serie, sigue a tu gente y gana premios por cada sesión.',
} as const;

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
