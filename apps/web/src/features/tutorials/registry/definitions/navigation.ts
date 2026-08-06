import type { TutorialDefinition } from '../../model/types';

export const mainNavigation: TutorialDefinition = {
  id: 'main-navigation',
  version: '1.0.0',
  title: 'Navegación principal',
  description: 'Conoce las secciones más usadas de la plataforma.',
  category: 'NAVIGATION',
  difficulty: 'BEGINNER',
  estimatedMinutes: 2,
  recommended: true,
  next: 'first-workout',
  steps: [
    {
      id: 'dashboard',
      title: 'Panel',
      description: 'Tu resumen: sesión activa, métricas recientes y avisos importantes.',
      target: 'nav:/dashboard',
      placement: 'right',
    },
    {
      id: 'workouts',
      title: 'Entrenamientos',
      description: 'Historial de sesiones y punto de partida para entrenar.',
      target: 'nav:/workouts',
      placement: 'right',
    },
    {
      id: 'exercises',
      title: 'Ejercicios',
      description: 'Catálogo global y tus ejercicios personales.',
      target: 'nav:/exercises',
      placement: 'right',
    },
    {
      id: 'profile',
      title: 'Mi perfil',
      description: 'Tus datos antropométricos y preferencias de cuenta.',
      target: 'nav:/profile',
      placement: 'right',
    },
    {
      id: 'help',
      title: 'Centro de ayuda',
      description: 'Vuelve aquí para repetir cualquier guía cuando lo necesites.',
      target: 'nav:/tutorials',
      placement: 'right',
    },
  ],
};
