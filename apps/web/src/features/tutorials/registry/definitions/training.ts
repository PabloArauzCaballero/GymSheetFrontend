import type { TutorialDefinition } from '../../model/types';

/** The core business flow: starting a training session. Non-destructive — the
 * guide leads the user to the form but never submits real data for them. */
export const firstWorkout: TutorialDefinition = {
  id: 'first-workout',
  version: '1.0.0',
  title: 'Registra tu primer entrenamiento',
  description: 'El flujo principal: desde el panel hasta iniciar una sesión.',
  category: 'TRAINING',
  difficulty: 'BEGINNER',
  estimatedMinutes: 3,
  recommended: true,
  route: '/dashboard',
  next: 'workout-history',
  steps: [
    {
      id: 'start-button',
      title: 'Inicia desde el panel',
      description: 'El panel siempre ofrece un acceso directo para empezar a entrenar.',
      route: '/dashboard',
      target: 'dashboard:start-workout',
      advanceOn: { type: 'click' },
      expectedAction: 'Pulsa “Iniciar entrenamiento”.',
      placement: 'bottom',
    },
    {
      id: 'context',
      title: 'Contexto de la sesión',
      description:
        'Puedes añadir una observación opcional para registrar el enfoque del día. No es obligatoria.',
      route: '/workouts/new',
      target: 'workouts:start-form',
      placement: 'auto',
    },
    {
      id: 'confirm',
      title: 'Cuando estés listo',
      description:
        'Pulsa “Iniciar entrenamiento” para crear la sesión y registrar tus series. En esta guía no crearemos datos por ti.',
      route: '/workouts/new',
      target: 'workouts:start-form',
      placement: 'top',
    },
  ],
};

export const workoutHistory: TutorialDefinition = {
  id: 'workout-history',
  version: '1.0.0',
  title: 'Consulta tu historial',
  description: 'Encuentra sesiones pasadas y expórtalas.',
  category: 'TRAINING',
  difficulty: 'BEGINNER',
  estimatedMinutes: 2,
  route: '/workouts',
  steps: [
    {
      id: 'open',
      title: 'Abre Entrenamientos',
      description: 'Tu historial vive en la sección de entrenamientos.',
      target: 'nav:/workouts',
      advanceOn: { type: 'click' },
      expectedAction: 'Abre “Entrenamientos”.',
      placement: 'right',
    },
    {
      id: 'list',
      title: 'Tus sesiones',
      description: 'Cada tarjeta es una sesión con su duración y volumen total.',
      route: '/workouts',
      target: 'page:workouts',
      placement: 'bottom',
    },
    {
      id: 'export',
      title: 'Exporta tu progreso',
      description: 'Descarga tu historial en JSON o CSV cuando lo necesites.',
      route: '/workouts',
      target: 'workouts:export',
      placement: 'left',
      optional: true,
    },
  ],
};

export const routinesAndPlans: TutorialDefinition = {
  id: 'routines-plans',
  version: '1.0.0',
  title: 'Rutinas y planes',
  description: 'Crea rutinas reutilizables y revisa los planes asignados.',
  category: 'TRAINING',
  difficulty: 'INTERMEDIATE',
  estimatedMinutes: 3,
  route: '/routines',
  steps: [
    {
      id: 'open',
      title: 'Abre Rutinas',
      description: 'Las rutinas son plantillas de entrenamiento reutilizables.',
      target: 'nav:/routines',
      advanceOn: { type: 'click' },
      expectedAction: 'Abre “Rutinas”.',
      placement: 'right',
    },
    {
      id: 'create',
      title: 'Crea o importa',
      description: 'Crea una rutina nueva o impórtala desde un archivo.',
      route: '/routines',
      target: 'routines:actions',
      placement: 'bottom',
    },
    {
      id: 'plans',
      title: 'Tus planes',
      description: 'En “Mis planes” ves las rutinas que un coach te asignó.',
      target: 'nav:/plans',
      placement: 'right',
    },
  ],
};

export const coachAssignments: TutorialDefinition = {
  id: 'coach-assignments',
  version: '1.0.0',
  title: 'Asignar rutinas a clientes',
  description: 'Guía específica para entrenadores.',
  category: 'TRAINING',
  difficulty: 'ADVANCED',
  estimatedMinutes: 3,
  roles: ['COACH', 'ENTRENADOR_EXTERNO'],
  prerequisites: ['routines-plans'],
  route: '/routines',
  steps: [
    {
      id: 'open',
      title: 'Abre Rutinas',
      description: 'Como entrenador, gestionas rutinas y sus asignaciones desde aquí.',
      target: 'nav:/routines',
      advanceOn: { type: 'click' },
      expectedAction: 'Abre “Rutinas”.',
      placement: 'right',
    },
    {
      id: 'assign',
      title: 'Asigna a un cliente',
      description:
        'Crea una rutina y, desde su detalle, asígnala a un cliente. La asignación aparecerá en sus planes.',
      route: '/routines',
      target: 'routines:actions',
      placement: 'bottom',
    },
  ],
};
