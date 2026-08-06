import type { TutorialDefinition } from '../../model/types';

export const membershipOverview: TutorialDefinition = {
  id: 'membership-overview',
  version: '1.0.0',
  title: 'Tu membresía y accesos',
  description: 'Consulta tu plan, accesos e historial.',
  category: 'MEMBERSHIP',
  difficulty: 'BEGINNER',
  estimatedMinutes: 2,
  roles: ['CLIENTE'],
  route: '/membership',
  steps: [
    {
      id: 'open',
      title: 'Abre Membresía',
      description: 'Aquí ves el estado de tu plan y tus accesos.',
      target: 'nav:/membership',
      advanceOn: { type: 'click' },
      expectedAction: 'Abre “Membresía”.',
      placement: 'right',
    },
    {
      id: 'overview',
      title: 'Tu plan y opciones',
      description:
        'Consulta tu plan actual, accesos reales, historial y opciones de renovación disponibles.',
      route: '/membership',
      target: 'page:membership',
      placement: 'bottom',
    },
  ],
};
