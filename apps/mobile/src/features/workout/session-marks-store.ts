import * as FileSystem from 'expo-file-system/legacy';
import { create } from 'zustand';
import type { OmittedMark, SkippedSet, Workout } from '@gymsheet/types';

/**
 * Lo que la persona decidió durante el entreno y el servidor todavía no tiene:
 * series saltadas, ejercicios omitidos y descansos cambiados a mano (D1, D2).
 *
 * Se escribe aquí PRIMERO, para que la pantalla responda al toque, y después
 * se intenta guardar en el servidor. Si el servidor lo acepta, la copia local
 * se borra (manda lo suyo). Si la ruta aún no existe (404) o no hay red, la
 * copia local se queda y el entreno sigue: nunca bloquea.
 *
 * Persiste en un archivo del directorio de documentos, igual que el borrador
 * del asistente: es una conveniencia, todo acceso va en `try/catch`.
 */
export type RestOverride = { descansoSeg?: number; descansoEntreSeg?: number; duracionSeg?: number };

export type SessionMarks = {
  skipped: Record<string, SkippedSet[]>;
  omitted: Record<string, OmittedMark>;
  rest: Record<string, RestOverride>;
};

const EMPTY: SessionMarks = { skipped: {}, omitted: {}, rest: {} };
const FILE_NAME = 'session-marks.v1.json';
const SAVE_DELAY_MS = 300;
/** Sesiones de las que se guardan marcas: la actual y alguna vieja sin cerrar. */
const MAX_SESSIONS = 6;

type State = {
  sessions: Record<string, SessionMarks>;
  hydrated: boolean;
  addSkip: (sessionId: string, exerciseId: string, skip: SkippedSet) => void;
  removeSkip: (sessionId: string, exerciseId: string, numeroSerie: number) => void;
  omit: (sessionId: string, exerciseId: string, mark: OmittedMark) => void;
  unomit: (sessionId: string, exerciseId: string) => void;
  setRest: (sessionId: string, exerciseId: string, override: RestOverride) => void;
  clearRest: (sessionId: string, exerciseIds: readonly string[]) => void;
  clear: (sessionId: string) => void;
};

function file(): string | null {
  return FileSystem.documentDirectory ? `${FileSystem.documentDirectory}${FILE_NAME}` : null;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function persist(sessions: Record<string, SessionMarks>) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const target = file();
    if (!target) return;
    const kept = Object.fromEntries(Object.entries(sessions).slice(-MAX_SESSIONS));
    void FileSystem.writeAsStringAsync(target, JSON.stringify(kept)).catch(() => undefined);
  }, SAVE_DELAY_MS);
}

export const useSessionMarks = create<State>((set, get) => {
  const update = (sessionId: string, change: (marks: SessionMarks) => SessionMarks) => {
    const sessions = { ...get().sessions, [sessionId]: change(get().sessions[sessionId] ?? EMPTY) };
    set({ sessions });
    persist(sessions);
  };
  return {
    sessions: {},
    hydrated: false,
    addSkip: (sessionId, exerciseId, skip) =>
      update(sessionId, (marks) => ({
        ...marks,
        skipped: {
          ...marks.skipped,
          [exerciseId]: [...(marks.skipped[exerciseId] ?? []).filter((item) => item.numeroSerie !== skip.numeroSerie), skip],
        },
      })),
    removeSkip: (sessionId, exerciseId, numeroSerie) =>
      update(sessionId, (marks) => ({
        ...marks,
        skipped: { ...marks.skipped, [exerciseId]: (marks.skipped[exerciseId] ?? []).filter((item) => item.numeroSerie !== numeroSerie) },
      })),
    omit: (sessionId, exerciseId, mark) => update(sessionId, (marks) => ({ ...marks, omitted: { ...marks.omitted, [exerciseId]: mark } })),
    unomit: (sessionId, exerciseId) =>
      update(sessionId, (marks) => {
        const omitted = { ...marks.omitted };
        delete omitted[exerciseId];
        return { ...marks, omitted };
      }),
    setRest: (sessionId, exerciseId, override) =>
      update(sessionId, (marks) => ({ ...marks, rest: { ...marks.rest, [exerciseId]: { ...marks.rest[exerciseId], ...override } } })),
    clearRest: (sessionId, exerciseIds) =>
      update(sessionId, (marks) => {
        const rest = { ...marks.rest };
        for (const id of exerciseIds) delete rest[id];
        return { ...marks, rest };
      }),
    clear: (sessionId) => {
      const sessions = { ...get().sessions };
      delete sessions[sessionId];
      set({ sessions });
      persist(sessions);
    },
  };
});

/** Lee el archivo una vez, al abrir el primer entreno. */
export async function hydrateSessionMarks(): Promise<void> {
  if (useSessionMarks.getState().hydrated) return;
  const target = file();
  let stored: Record<string, SessionMarks> = {};
  if (target) {
    try {
      const parsed: unknown = JSON.parse(await FileSystem.readAsStringAsync(target));
      if (parsed && typeof parsed === 'object') stored = parsed as Record<string, SessionMarks>;
    } catch {
      // Sin archivo (o ilegible): se empieza sin marcas locales.
    }
  }
  // Lo que se marcó mientras se leía el archivo gana a lo guardado.
  useSessionMarks.setState((state) => ({ hydrated: true, sessions: { ...stored, ...state.sessions } }));
}

/**
 * La sesión del servidor con las marcas locales encima. Una serie saltada en
 * local desaparece si ya hay una serie real (o saltada en el servidor) con ese
 * número: la persona se arrepintió y la hizo.
 */
export function mergeMarks(data: Workout, marks: SessionMarks | undefined): Workout {
  if (!marks) return data;
  let changed = false;
  const ejercicios = data.ejercicios.map((item) => {
    const localSkips = marks.skipped[item.id] ?? [];
    const localOmit = marks.omitted[item.id];
    const rest = marks.rest[item.id];
    if (localSkips.length === 0 && !localOmit && !rest) return item;
    changed = true;
    const taken = new Set([...item.series.map((set) => set.numeroSerie), ...item.saltadas.map((skip) => skip.numeroSerie)]);
    return {
      ...item,
      saltadas: [...item.saltadas, ...localSkips.filter((skip) => !taken.has(skip.numeroSerie))],
      omitido: item.omitido ?? localOmit ?? null,
      descansoSeg: rest?.descansoSeg ?? item.descansoSeg,
      descansoEntreSeg: rest?.descansoEntreSeg ?? item.descansoEntreSeg,
      duracionSeg: rest?.duracionSeg ?? item.duracionSeg,
    };
  });
  return changed ? { ...data, ejercicios } : data;
}
