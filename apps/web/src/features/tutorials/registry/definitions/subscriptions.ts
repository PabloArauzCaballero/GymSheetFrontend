import type { TutorialDefinition } from '../../model/types';

/** «Mis suscripciones» (franja 8e) replaces the gym-operated «Membresía». */
export const subscriptionsOverview: TutorialDefinition = {
  id: 'subscriptions-overview',
  version: '1.0.0',
  title: 'Tus suscripciones',
  description: 'Mira tus planes, sus días y renueva desde el marketplace.',
  category: 'MEMBERSHIP',
  difficulty: 'BEGINNER',
  estimatedMinutes: 2,
  roles: ['CLIENTE'],
  route: '/profile/suscripciones',
  steps: [
    {
      id: 'open',
      title: 'Abre Mis suscripciones',
      description: 'Aquí ves cada plan que compraste, por negocio.',
      target: 'nav:/profile/suscripciones',
      advanceOn: { type: 'click' },
      expectedAction: 'Abre “Mis suscripciones”.',
      placement: 'right',
    },
    {
      id: 'overview',
      title: 'Tus planes y sus días',
      description: 'Cada plan muestra su estado, los días que quedan y «Renovar», que te lleva a la publicación.',
      route: '/profile/suscripciones',
      target: 'page:subscriptions',
      placement: 'bottom',
    },
  ],
};
