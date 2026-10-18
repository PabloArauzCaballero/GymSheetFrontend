import type { TutorialDefinition } from '../../model/types';

/**
 * La senda explicada paso a paso: quién eres, los retos de la semana, la
 * colección en cadenas y hacia dónde vas (mismo orden que el tour del móvil). Las anclas viven en `progression-client.tsx`; si un paso no
 * encuentra la suya —una cuenta sin rango todavía— se salta en vez de fallar.
 */
export const sendaOverview: TutorialDefinition = {
  id: 'senda-overview',
  version: '1.1.0',
  title: 'Tu senda',
  description: 'Cómo ganas puntos, los retos de la semana, tus insignias y cómo subes de rango.',
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
      id: 'challenges',
      title: 'Retos de la semana',
      description:
        'Cada lunes, tres retos hechos a tu medida: fácil, medio y difícil. Cumple los tres y la semana es redonda, con puntos extra.',
      route: '/trayectoria',
      target: 'progression:challenges',
      placement: 'bottom',
      optional: true,
    },
    {
      id: 'badges',
      title: 'Tu colección',
      description:
        'Las insignias van en cadenas: cada ficha dice en qué nivel vas y cuál es la siguiente. Ábrela para ver sus pasos.',
      route: '/trayectoria',
      target: 'progression:badges',
      placement: 'top',
    },
    {
      id: 'path',
      title: 'El camino',
      description:
        'Todos los rangos, también los que te quedan. Cada uno pide más puntos que el anterior.',
      route: '/trayectoria',
      target: 'progression:path',
      placement: 'right',
    },
  ],
};
