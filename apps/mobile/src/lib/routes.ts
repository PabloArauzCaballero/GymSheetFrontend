import type { Href } from 'expo-router';

/**
 * Rutas de navegación de la app que se repiten en más de una pantalla.
 *
 * El catálogo de ejercicios dejó de ser una pestaña (C4): vive en la pila
 * hermana `app/(app)/ejercicios/` y se abre desde Rutinas («Explorar
 * ejercicios»), desde Perfil («Mis ejercicios y favoritos») y desde las fichas.
 * Escribir la ruta a mano en cada sitio es lo que hizo falta cambiar en diez
 * archivos al mover la carpeta; con este helper el próximo cambio es uno.
 */
export const routes = {
  /** El buscador. `favoritos: true` lo abre con el filtro ☆ puesto. */
  exercises(options?: { favoritos?: boolean }): Href {
    return options?.favoritos
      ? { pathname: '/ejercicios', params: { favoritos: '1' } }
      : '/ejercicios';
  },
  /** El buscador con el filtro ☆ puesto (Perfil → «Mis ejercicios y favoritos»). */
  exerciseFavorites(): Href {
    return routes.exercises({ favoritos: true });
  },
  /** La ficha de un ejercicio, con ♥ y ☆. */
  exercise(id: string): Href {
    return { pathname: '/ejercicios/[id]', params: { id } };
  },
  /** Todos los músculos en lista: la alternativa accesible a la figura. */
  muscles(): Href {
    return '/ejercicios/muscles';
  },
  /** Los ejercicios de un músculo (código del atlas: `PECTORALIS_MAJOR`…). */
  muscle(code: string): Href {
    return { pathname: '/ejercicios/muscle/[code]', params: { code } };
  },
} as const;
