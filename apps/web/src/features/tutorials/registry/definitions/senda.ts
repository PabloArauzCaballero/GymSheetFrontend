import type { TutorialDefinition } from '../../model/types';

/**
 * La senda explicada en tres pasos: quién eres, hacia dónde vas y qué retos
 * suman extra. Las anclas viven en `progression-client.tsx`; si un paso no
 * encuentra la suya —una cuenta sin rango todavía— se salta en vez de fallar.
 */
export const sendaOverview: TutorialDefinition = {
  id: 'senda-overview',
  version: '1.0.0',
  title: 'Tu senda',
  description: 'Cómo ganas puntos, cómo subes de rango y qué son las insignias.',
  category: 'PROGRESSION',
  difficulty: 'BEGINNER',
  estimatedMinutes: 2,
  recommended: true,
  route: '/trayectoria',
  steps: [
    {
      id: 'rank',
      title: 'Tu rango y tus puntos',
      description:
        'Ganas puntos cada vez que entrenas, y nunca bajan. La barra te dice cuánto falta para el siguiente rango.',
      route: '/trayectoria',
      target: 'progression:rank',
      placement: 'bottom',
    },
    {
      id: 'rules',
      title: 'Cómo se ganan',
      description: 'Aquí ves cada regla con tus propios números al lado.',
      route: '/trayectoria',
      target: 'progression:rules',
      placement: 'bottom',
      optional: true,
    },
    {
      id: 'path',
      title: 'El camino',
      description: 'Todos los rangos, también los que te quedan. Cada uno pide más puntos que el anterior.',
      route: '/trayectoria',
      target: 'progression:path',
      placement: 'right',
    },
    {
      id: 'badges',
      title: 'Insignias',
      description:
        'Retos concretos que suman puntos extra. La rareza dice lo difícil que es cada una.',
      route: '/trayectoria',
      target: 'progression:badges',
      placement: 'top',
    },
  ],
};
