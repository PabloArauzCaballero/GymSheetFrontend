'use client';

import { useSyncExternalStore } from 'react';
import {
  createInitialState,
  hasContent,
  parseDraft,
  routineDraftReducer,
  serializeDraft,
  type WizardAction,
  type WizardState,
} from '@gymsheet/hooks';

/**
 * Borrador del asistente de creación de rutinas en la web.
 *
 * Es un almacén externo y no un contexto de React porque el asistente salta a la
 * ficha de un ejercicio (`/routines/new/ejercicio/[id]`) y a la lista de días,
 * rutas distintas que tienen que ver el mismo borrador. El reductor y las
 * reglas son los de `@gymsheet/hooks`, compartidos con el móvil.
 *
 * Persistencia en `sessionStorage` (sobrevive a recargar la pestaña, no a
 * cerrarla), siempre en `try/catch`: en una ventana privada o con el
 * almacenamiento bloqueado el asistente funciona igual, sólo en memoria.
 */
const STORAGE_KEY = 'gymsheet.routine-draft.v1';

let state: WizardState = createInitialState();
let hydrated = false;
const listeners = new Set<() => void>();

function readStorage(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStorage(next: WizardState): void {
  try {
    if (hasContent(next.draft)) {
      window.sessionStorage.setItem(STORAGE_KEY, serializeDraft(next.draft, next.paso));
    } else {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Sin almacenamiento: el borrador vive sólo mientras la pestaña siga abierta.
  }
}

/** Restaura lo guardado la primera vez que alguien lo pide en el navegador. */
function hydrate(): void {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  const persisted = parseDraft(readStorage());
  if (persisted && hasContent(persisted.draft)) {
    state = routineDraftReducer(createInitialState(), {
      type: 'hidratar',
      draft: persisted.draft,
      paso: persisted.paso,
    });
  }
}

export function dispatchRoutineDraft(action: WizardAction): void {
  hydrate();
  const next = routineDraftReducer(state, action);
  if (next === state) return;
  state = next;
  writeStorage(next);
  listeners.forEach((listener) => listener());
}

/** El estado actual, para leerlo fuera de un render (por ejemplo, al montar). */
export function getRoutineDraft(): WizardState {
  hydrate();
  return state;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const serverSnapshot = createInitialState();

/** `useRoutineDraft`: el estado del asistente y la forma de modificarlo. */
export function useRoutineDraft(): {
  state: WizardState;
  draft: WizardState['draft'];
  dispatch: (action: WizardAction) => void;
} {
  const current = useSyncExternalStore(subscribe, getRoutineDraft, () => serverSnapshot);
  return { state: current, draft: current.draft, dispatch: dispatchRoutineDraft };
}
