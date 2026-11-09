import * as FileSystem from 'expo-file-system/legacy';
import { create } from 'zustand';

/**
 * Qué sesiones se están armando «sobre la marcha» (rutina in situ): sin plan
 * previo, ejercicio a ejercicio, y al final se pueden guardar como rutina.
 *
 * Es una marca solo del teléfono: el servidor ve una sesión libre normal. Se
 * guarda en un archivo (igual que las marcas de sesión) para que sobreviva a
 * cerrar la app a mitad de entreno; todo acceso va en `try/catch`.
 */
const FILE_NAME = 'in-situ-sessions.v1.json';
/** La actual y alguna vieja sin cerrar. */
const MAX_SESSIONS = 6;

type State = {
  sessions: string[];
  hydrated: boolean;
  mark: (sessionId: string) => void;
  clear: (sessionId: string) => void;
};

function file(): string | null {
  return FileSystem.documentDirectory ? `${FileSystem.documentDirectory}${FILE_NAME}` : null;
}

function persist(sessions: readonly string[]) {
  const target = file();
  if (!target) return;
  void FileSystem.writeAsStringAsync(target, JSON.stringify(sessions.slice(-MAX_SESSIONS))).catch(() => undefined);
}

export const useInSituSessions = create<State>((set, get) => ({
  sessions: [],
  hydrated: false,
  mark: (sessionId) => {
    if (get().sessions.includes(sessionId)) return;
    const sessions = [...get().sessions, sessionId].slice(-MAX_SESSIONS);
    set({ sessions });
    persist(sessions);
  },
  clear: (sessionId) => {
    if (!get().sessions.includes(sessionId)) return;
    const sessions = get().sessions.filter((item) => item !== sessionId);
    set({ sessions });
    persist(sessions);
  },
}));

/** Lee el archivo una vez, al abrir el entreno. */
export async function hydrateInSituSessions(): Promise<void> {
  if (useInSituSessions.getState().hydrated) return;
  const target = file();
  let stored: string[] = [];
  if (target) {
    try {
      const parsed: unknown = JSON.parse(await FileSystem.readAsStringAsync(target));
      if (Array.isArray(parsed)) stored = parsed.filter((item): item is string => typeof item === 'string');
    } catch {
      // Sin archivo (o ilegible): ninguna sesión marcada.
    }
  }
  useInSituSessions.setState((state) => ({ hydrated: true, sessions: [...new Set([...stored, ...state.sessions])] }));
}

export function isInSitu(sessions: readonly string[], sessionId: string): boolean {
  return sessions.includes(sessionId);
}
