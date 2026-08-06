import type { TutorialDefinition } from '../../model/types';

export const profileBasics: TutorialDefinition = {
  id: 'profile-basics',
  version: '1.0.0',
  title: 'Tu perfil',
  description: 'Revisa y mantén al día tus datos personales.',
  category: 'PROFILE',
  difficulty: 'BEGINNER',
  estimatedMinutes: 2,
  route: '/profile',
  steps: [
    {
      id: 'open',
      title: 'Abre tu perfil',
      description: 'Entra a la sección de perfil desde el menú principal.',
      target: 'nav:/profile',
      advanceOn: { type: 'click' },
      expectedAction: 'Abre “Mi perfil”.',
      placement: 'right',
    },
    {
      id: 'header',
      title: 'Datos de cuenta',
      description:
        'Aquí gestionas tus datos antropométricos con las unidades canónicas del sistema (kg y cm).',
      route: '/profile',
      target: 'page:profile',
      placement: 'bottom',
    },
  ],
};
