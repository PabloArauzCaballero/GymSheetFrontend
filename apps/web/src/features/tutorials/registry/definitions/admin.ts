import type { TutorialDefinition } from '../../model/types';

export const adminOperations: TutorialDefinition = {
  id: 'admin-operations',
  version: '2.0.0',
  title: 'Operar un gimnasio',
  description: 'Guía para la administración de REPP.',
  category: 'ADMIN',
  difficulty: 'INTERMEDIATE',
  estimatedMinutes: 3,
  roles: ['SYSTEM_ADMIN'],
  route: '/admin',
  steps: [
    {
      id: 'open',
      title: 'Abre Operaciones',
      description:
        'Elige en Sistema el gimnasio que vas a operar. Mientras lo operas, la franja de arriba te lo recuerda en cada página.',
      target: 'nav:/admin',
      advanceOn: { type: 'click' },
      expectedAction: 'Abre “Operaciones”.',
      placement: 'right',
    },
    {
      id: 'overview',
      title: 'Los módulos del gimnasio',
      description:
        'Equipamiento, clientes, instalaciones y accesos del gimnasio que operas. Pulsa «Salir» en la franja para volver a toda la plataforma.',
      route: '/admin',
      target: 'page:admin',
      placement: 'bottom',
    },
  ],
};
