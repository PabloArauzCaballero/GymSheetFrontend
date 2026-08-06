import type { TutorialDefinition } from '../../model/types';

export const adminOperations: TutorialDefinition = {
  id: 'admin-operations',
  version: '1.0.0',
  title: 'Panel de operaciones',
  description: 'Guía para administración y recepción.',
  category: 'ADMIN',
  difficulty: 'INTERMEDIATE',
  estimatedMinutes: 3,
  roles: ['ADMIN', 'FRONT_DESK'],
  route: '/admin',
  steps: [
    {
      id: 'open',
      title: 'Abre Operaciones',
      description: 'El panel de administración reúne equipamiento, clientes, instalaciones y accesos.',
      target: 'nav:/admin',
      advanceOn: { type: 'click' },
      expectedAction: 'Abre “Operaciones”.',
      placement: 'right',
    },
    {
      id: 'overview',
      title: 'Superficie por rol',
      description:
        'Cada módulo respeta los permisos del backend. FRONT_DESK ve y ejecuta solo lo autorizado; ADMIN gestiona todo.',
      route: '/admin',
      target: 'page:admin',
      placement: 'bottom',
    },
  ],
};
