import type { FlowBlock, FlowItem } from './workout-flow.ts';

export type NodeState = 'done' | 'partial' | 'empty';

/**
 * Estado de un nodo del repaso: ✓ si cada ejercicio del bloque llegó a su
 * objetivo (uno sin objetivo, con una serie), aro si algo se registró, tenue si
 * nada. Las series saltadas y los omitidos no cuentan como trabajo hecho.
 */
export function reviewNodeState(block: Pick<FlowBlock<FlowItem>, 'items'>): NodeState {
  const { items } = block;
  if (items.length > 0 && items.every((item) => !item.omitted && item.logged >= Math.max(1, item.target ?? 1))) return 'done';
  return items.some((item) => item.logged > 0) ? 'partial' : 'empty';
}

/** Línea para un ejercicio sin series en una sesión cerrada; `null` si tiene series. */
export function unloggedNote(item: Pick<FlowItem, 'logged' | 'omitted'>): string | null {
  if (item.logged > 0) return null;
  return item.omitted ? 'Omitido' : 'Sin series registradas';
}
