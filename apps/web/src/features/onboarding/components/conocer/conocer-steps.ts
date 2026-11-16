import type { SocialProfileSection } from '@/features/social/components/conocer/social-profile-editor';

export type ConocerStep = 'preferences' | SocialProfileSection | 'photos';

/** Photos needed to appear in the Conocer deck (the backend's PHOTOS gap). */
export const CONOCER_MIN_PHOTOS = 2;

/** The optional "Conocer" step, in order. Each substep saves on «Continuar». */
export const conocerSteps: { key: ConocerStep; title: string; subline: string }[] = [
  {
    key: 'preferences',
    title: '¿Qué buscas?',
    subline: 'Elige qué buscas, a quién quieres ver, qué edades y a qué distancia.',
  },
  { key: 'interests', title: 'Elige tus intereses', subline: 'Hasta 5. Te ayudan a dar con gente afín.' },
  { key: 'habits', title: 'Cuéntanos tus hábitos', subline: 'Todo es opcional. Toca otra vez para quitar una respuesta.' },
  { key: 'orientation', title: 'Tu orientación', subline: 'Opcional y oculta, salvo que elijas mostrarla.' },
  { key: 'bio', title: 'Escribe tu bio', subline: 'Unas líneas sobre ti. Hasta 500 caracteres.' },
  {
    key: 'photos',
    title: 'Sube tus fotos',
    subline: `Sube al menos ${CONOCER_MIN_PHOTOS} para aparecer en Conocer.`,
  },
];
