import type {
  DiscoveryIntent,
  DiscoveryReadinessCode,
  DrinkingHabit,
  Orientation,
  PetOption,
  SmokingHabit,
} from '@gymsheet/schemas';

/** Spanish labels for the "Conocer" questions, shared by web and mobile. */

export const intentLabels: Record<DiscoveryIntent, string> = {
  TRAINING: 'Compañero de entreno',
  FRIENDSHIP: 'Amistad',
  DATING: 'Citas',
  UNSURE: 'Aún no lo sé',
};

export const orientationLabels: Record<Orientation, string> = {
  HETEROSEXUAL: 'Heterosexual',
  GAY: 'Gay',
  LESBIAN: 'Lesbiana',
  BISEXUAL: 'Bisexual',
  ASEXUAL: 'Asexual',
  DEMISEXUAL: 'Demisexual',
  PANSEXUAL: 'Pansexual',
  QUEER: 'Queer',
  QUESTIONING: 'Lo estoy descubriendo',
};

export const drinkingLabels: Record<DrinkingHabit, string> = {
  NEVER: 'No tomo',
  SOCIALLY: 'En ocasiones sociales',
  OFTEN: 'Seguido',
};

export const smokingLabels: Record<SmokingHabit, string> = {
  NEVER: 'No fumo',
  SOMETIMES: 'A veces',
  OFTEN: 'Seguido',
};

export const petLabels: Record<PetOption, string> = {
  NONE: 'Sin mascotas',
  DOG: 'Perro',
  CAT: 'Gato',
  OTHER: 'Otra mascota',
  WANTS: 'Quiero tener',
};

/** What each readiness gap asks the person to do, as a call to action. */
export const readinessLabels: Record<DiscoveryReadinessCode, { title: string; action: string }> = {
  EMAIL_VERIFICATION: { title: 'Verifica tu correo', action: 'Verificar correo' },
  PROFILE_ENABLED: { title: 'Activa tu perfil social', action: 'Activar perfil' },
  PREFERENCES: { title: 'Dinos a quién quieres conocer', action: 'Elegir preferencias' },
  PHOTOS: { title: 'Sube al menos 2 fotos', action: 'Subir fotos' },
};

/** Readiness codes this client knows how to explain; unknown ones are skipped. */
export function knownReadinessGaps(missing: readonly string[]): DiscoveryReadinessCode[] {
  return missing.filter((code): code is DiscoveryReadinessCode => code in readinessLabels);
}

/**
 * "Conocer" (its onboarding step and editor) is for members only: staff has no
 * deck and the backend would refuse their social profile.
 */
export function offersConocer(role: string | null | undefined): boolean {
  return role === 'CLIENTE';
}
