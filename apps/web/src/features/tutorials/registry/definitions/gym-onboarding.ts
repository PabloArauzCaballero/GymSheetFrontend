import type { TutorialDefinition } from '../../model/types';

/**
 * Puesta en marcha de un gimnasio nuevo.
 *
 * Es el recorrido que hace una persona el primer día, cuando la aplicación está
 * vacía y no sabe por dónde empezar. El orden no es arbitrario: cada paso
 * desbloquea el siguiente. Sin sede no se puede ubicar equipamiento; sin planes
 * no se puede dar de alta a nadie con membresía; sin clientes el panel de
 * operación no tiene nada que contar.
 *
 * Termina en el panel a propósito. Quien acaba de configurar su gimnasio
 * necesita ver que lo que registró aparece en algún sitio, o la configuración
 * se siente como papeleo.
 */
export const gymOnboarding: TutorialDefinition = {
  id: 'gym-onboarding',
  version: '1.0.0',
  title: 'Poner en marcha tu gimnasio',
  description:
    'De una instalación vacía a poder cobrar y controlar el acceso, en seis pasos.',
  category: 'ADMIN',
  difficulty: 'BEGINNER',
  estimatedMinutes: 6,
  roles: ['ADMIN'],
  route: '/admin',
  steps: [
    {
      id: 'bienvenida',
      title: 'Vamos a dejar tu gimnasio listo',
      description:
        'Seis pasos, en este orden porque cada uno hace posible el siguiente: tu sede, tu equipamiento, tus planes, tu equipo de trabajo, tus primeros clientes y el panel donde verás si funciona. Puedes salir cuando quieras y retomarlo desde el Centro de ayuda.',
      placement: 'center',
    },
    {
      id: 'sede',
      title: 'Primero, tu sede',
      description:
        'Una sede es el sitio físico: su dirección, sus salas y sus puntos de acceso. Todo lo demás cuelga de aquí, incluido dónde está cada máquina.',
      route: '/admin/facilities',
      target: 'nav:/admin/facilities',
      placement: 'right',
      expectedAction: 'Abre «Instalaciones» y registra tu sede.',
      advanceOn: { type: 'route', route: '/admin/facilities' },
    },
    {
      id: 'equipamiento',
      title: 'Tu equipamiento, sin escribirlo a mano',
      description:
        'Trae un catálogo con el equipamiento que casi todo gimnasio tiene, agrupado por zona. Marca lo que tengas y se registra solo; lo que no esté en la lista lo añades tú. Esto es lo que después alimenta el informe de qué máquinas se usan.',
      route: '/admin/equipment',
      target: 'nav:/admin/equipment',
      placement: 'right',
      expectedAction: 'Abre «Equipamiento» y marca lo que tengas.',
      advanceOn: { type: 'route', route: '/admin/equipment' },
    },
    {
      id: 'planes',
      title: 'Qué vendes',
      description:
        'Un plan es lo que la gente compra: su precio, cuántos días dura y a qué da acceso. Sin al menos uno no puedes registrar membresías, ni cobrar, ni activar a nadie que pague en efectivo.',
      route: '/admin/membership',
      target: 'nav:/admin/membership',
      placement: 'right',
      expectedAction: 'Abre «Clientes» y crea tu primer plan.',
      advanceOn: { type: 'route', route: '/admin/membership' },
    },
    {
      id: 'personal',
      title: 'Quién trabaja contigo',
      description:
        'Recepción y entrenadores tienen permisos distintos: recepción cobra y activa cuentas, los entrenadores asignan rutinas. Cada quien ve sólo lo suyo, y eso lo decide el backend, no la pantalla.',
      route: '/admin/membership',
      placement: 'center',
    },
    {
      id: 'clientes',
      title: 'Tus primeros clientes',
      description:
        'Al dar de alta a alguien no escribes su contraseña: se genera sola y le llega por correo con la recomendación de cambiarla. Tú sólo necesitas su nombre, su correo y su plan.',
      route: '/admin/usuarios',
      target: 'nav:/admin/usuarios',
      placement: 'right',
      expectedAction: 'Abre «Usuarios» para ver todas las cuentas.',
      advanceOn: { type: 'route', route: '/admin/usuarios' },
    },
    {
      id: 'panel',
      title: 'Y aquí ves si funciona',
      description:
        'El panel del gimnasio responde las tres preguntas que cuestan dinero: qué máquinas se usan —de ahí sale tu próxima compra—, cuánta gente entra frente a cuánta registra su entreno, y a quién hay que llamar hoy porque dejó de pagar.',
      route: '/admin/operacion',
      target: 'nav:/admin/operacion',
      placement: 'right',
      expectedAction: 'Abre «Panel del gimnasio».',
      advanceOn: { type: 'route', route: '/admin/operacion' },
    },
  ],
};
