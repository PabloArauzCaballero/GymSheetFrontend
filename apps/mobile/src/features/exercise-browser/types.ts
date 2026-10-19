import type { Exercise } from '@gymsheet/types';

/**
 * Lo que el buscador necesita para funcionar como selector: qué está ya elegido,
 * cómo añadir y quitar, y a dónde ir al tocar una fila (la ficha). Lo aporta la
 * pantalla del asistente; el buscador no sabe nada de rutinas.
 */
export type PickConfig = {
  isAdded: (exerciseId: string) => boolean;
  add: (exercise: Exercise) => void;
  remove: (exerciseId: string) => void;
  onOpen: (exerciseId: string) => void;
};
