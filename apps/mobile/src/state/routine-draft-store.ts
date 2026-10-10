import * as FileSystem from 'expo-file-system/legacy';
import { create } from 'zustand';
import {
  createInitialState,
  hasContent,
  parseDraft,
  routineDraftReducer,
  serializeDraft,
  type PersistedDraft,
  type WizardAction,
  type WizardState,
} from '@gymsheet/hooks';

/**
 * Borrador del asistente de creación de rutinas, compartido por todas las
 * pantallas del asistente. El reductor y las reglas viven en `@gymsheet/hooks`
 * (los comparte con la web); aquí sólo está el almacén de este dispositivo.
 *
 * Persistencia: un archivo en el directorio de documentos de la app, no
 * `SecureStore` (un borrador con ejercicios supera con holgura lo que admite una
 * clave) ni `AsyncStorage` (no es una dependencia de la app). Es una
 * conveniencia, no un dato crítico: todo acceso va en `try/catch` y la pantalla
 * funciona igual si el archivo no se puede leer o escribir.
 */
const FILE_NAME = 'routine-draft.v1.json';
const SAVE_DELAY_MS = 400;

function draftFile(): string | null {
  return FileSystem.documentDirectory ? `${FileSystem.documentDirectory}${FILE_NAME}` : null;
}

async function readFile(): Promise<string | null> {
  const file = draftFile();
  if (!file) return null;
  try {
    return await FileSystem.readAsStringAsync(file);
  } catch {
    return null;
  }
}

async function writeFile(contents: string): Promise<void> {
  const file = draftFile();
  if (!file) return;
  try {
    await FileSystem.writeAsStringAsync(file, contents);
  } catch {
    // Sin disco no hay borrador persistente, pero el asistente sigue en memoria.
  }
}

async function removeFile(): Promise<void> {
  const file = draftFile();
  if (!file) return;
  try {
    await FileSystem.deleteAsync(file, { idempotent: true });
  } catch {
    // Nada que borrar o no se puede: da igual.
  }
}

type RoutineDraftStore = {
  state: WizardState;
  /** Borrador encontrado en el dispositivo al entrar, si merece retomarse. */
  pendiente: PersistedDraft | null;
  dispatch: (action: WizardAction) => void;
  /** Lee el archivo y, si hay un borrador con contenido, lo deja en `pendiente`. */
  buscarPendiente: () => Promise<void>;
  retomar: () => PersistedDraft | null;
  descartar: () => void;
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(state: WizardState): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (hasContent(state.draft)) void writeFile(serializeDraft(state.draft, state.paso));
    else void removeFile();
  }, SAVE_DELAY_MS);
}

export const useRoutineDraftStore = create<RoutineDraftStore>((set, get) => ({
  state: createInitialState(),
  pendiente: null,

  dispatch: (action) => {
    const next = routineDraftReducer(get().state, action);
    if (next === get().state) return;
    set({ state: next });
    if (action.type === 'reiniciar') {
      if (saveTimer) clearTimeout(saveTimer);
      void removeFile();
      return;
    }
    scheduleSave(next);
  },

  buscarPendiente: async () => {
    const inMemory = get().state;
    if (hasContent(inMemory.draft)) {
      set({ pendiente: { draft: inMemory.draft, paso: inMemory.paso } });
      return;
    }
    const persisted = parseDraft(await readFile());
    set({
      pendiente: persisted && hasContent(persisted.draft) ? persisted : null,
    });
  },

  retomar: () => {
    const pendiente = get().pendiente;
    if (!pendiente) return null;
    get().dispatch({
      type: 'hidratar',
      draft: pendiente.draft,
      paso: pendiente.paso,
    });
    set({ pendiente: null });
    return pendiente;
  },

  descartar: () => {
    set({ pendiente: null });
    get().dispatch({ type: 'reiniciar' });
  },
}));
