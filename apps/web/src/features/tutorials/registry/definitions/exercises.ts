import type { TutorialDefinition } from '../../model/types';

export const exerciseLibrary: TutorialDefinition = {
  id: 'exercise-library',
  version: '1.0.0',
  title: 'Explora la biblioteca de ejercicios',
  description: 'Busca, filtra y crea ejercicios personales.',
  category: 'EXERCISES',
  difficulty: 'BEGINNER',
  estimatedMinutes: 3,
  route: '/exercises',
  steps: [
    {
      id: 'open',
      title: 'Abre Ejercicios',
      description: 'El catálogo global y tus ejercicios personales están aquí.',
      target: 'nav:/exercises',
      advanceOn: { type: 'click' },
      expectedAction: 'Abre “Ejercicios”.',
      placement: 'right',
    },
    {
      id: 'search',
      title: 'Busca por nombre o músculo',
      description: 'Escribe un nombre, un músculo o una parte del cuerpo para acotar la lista.',
      route: '/exercises',
      target: 'exercises:search',
      expectedAction: 'Prueba a escribir en el buscador.',
      placement: 'bottom',
    },
    {
      id: 'filter',
      title: 'Filtra por grupo muscular',
      description: 'Combina la búsqueda con el filtro por grupo muscular.',
      route: '/exercises',
      target: 'exercises:filter',
      placement: 'bottom',
    },
    {
      id: 'new',
      title: 'Crea un ejercicio personal',
      description: 'Si falta un ejercicio, créalo para tu cuenta sin afectar el catálogo global.',
      route: '/exercises',
      target: 'exercises:new',
      placement: 'left',
    },
  ],
};
