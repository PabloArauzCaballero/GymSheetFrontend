import type { TutorialDefinition } from '../../model/types';

export const platformIntro: TutorialDefinition = {
  id: 'platform-intro',
  version: '1.0.0',
  title: 'Bienvenido a {marca}',
  description: 'Un recorrido de un minuto por las zonas clave de la plataforma.',
  category: 'INTRODUCTION',
  difficulty: 'BEGINNER',
  estimatedMinutes: 1,
  recommended: true,
  autoStart: true,
  next: 'main-navigation',
  steps: [
    {
      id: 'welcome',
      title: '¡Hola! 👋',
      description:
        'Te mostraremos cómo moverte por {marca} en unos pasos breves. Puedes cerrar esta guía cuando quieras y retomarla desde el Centro de ayuda.',
      placement: 'center',
    },
    {
      id: 'nav',
      title: 'Menú principal',
      description: 'Desde aquí accedes a tus entrenamientos, rutinas, ejercicios y perfil.',
      target: 'nav:/dashboard',
      placement: 'right',
    },
    {
      id: 'help',
      title: 'Ayuda siempre a mano',
      description: 'Este botón abre una guía de la pantalla actual o el Centro de ayuda.',
      target: 'help-launcher',
      placement: 'bottom',
    },
    {
      id: 'theme',
      title: 'Tema claro u oscuro',
      description: 'Cambia la apariencia cuando lo prefieras; respetamos tu preferencia del sistema.',
      target: 'theme-toggle',
      placement: 'bottom',
    },
    {
      id: 'done',
      title: 'Todo listo',
      description:
        'Cuando quieras, continúa con el recorrido de navegación desde el Centro de ayuda.',
      placement: 'center',
    },
  ],
};

export const helpCenterTour: TutorialDefinition = {
  id: 'help-center-tour',
  version: '1.0.0',
  title: 'Cómo usar el Centro de ayuda',
  description: 'Encuentra, inicia y repite cualquier tutorial cuando lo necesites.',
  category: 'INTRODUCTION',
  difficulty: 'BEGINNER',
  estimatedMinutes: 2,
  route: '/tutorials',
  steps: [
    {
      id: 'open',
      title: 'Abre el Centro de ayuda',
      description: 'Aquí viven todos los tutoriales disponibles para tu perfil.',
      target: 'nav:/tutorials',
      advanceOn: { type: 'click' },
      expectedAction: 'Abre “Centro de ayuda”.',
      placement: 'right',
    },
    {
      id: 'overview',
      title: 'Tu avance',
      description: 'Consulta cuántos tutoriales completaste y cuántos quedan pendientes.',
      route: '/tutorials',
      target: 'page:tutorials',
      placement: 'bottom',
    },
    {
      id: 'launch',
      title: 'Inicia cuando quieras',
      description: 'Cada tarjeta permite comenzar, continuar, repetir o reiniciar un tutorial.',
      route: '/tutorials',
      target: 'tutorial-card:platform-intro',
      placement: 'auto',
      optional: true,
    },
  ],
};
