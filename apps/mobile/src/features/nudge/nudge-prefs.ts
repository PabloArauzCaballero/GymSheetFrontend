import * as FileSystem from 'expo-file-system/legacy';
import { create } from 'zustand';

/**
 * Ajustes de Repi en este dispositivo: si el widget de matches muestra el
 * nombre (en la pantalla de inicio; la bloqueada nunca) y si Repi manda
 * notificaciones. Mismo patrón que el borrador de rutinas: un archivo en
 * documentos, todo acceso en `try/catch`, y sin archivo valen los valores por
 * defecto.
 */
export type NudgePrefs = { showMatchNames: boolean; notifications: boolean };

const DEFAULTS: NudgePrefs = { showMatchNames: true, notifications: true };
const FILE_NAME = 'nudge-prefs.v1.json';

function prefsFile(): string | null {
  return FileSystem.documentDirectory ? `${FileSystem.documentDirectory}${FILE_NAME}` : null;
}

type State = NudgePrefs & {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  set: (patch: Partial<NudgePrefs>) => void;
};

export const useNudgePrefs = create<State>((setState, getState) => ({
  ...DEFAULTS,
  hydrated: false,
  hydrate: async () => {
    if (getState().hydrated) return;
    const file = prefsFile();
    let stored: Partial<NudgePrefs> = {};
    try {
      if (file) stored = JSON.parse(await FileSystem.readAsStringAsync(file)) as Partial<NudgePrefs>;
    } catch {
      // Primera vez o archivo ilegible: valores por defecto.
    }
    setState({
      showMatchNames: typeof stored.showMatchNames === 'boolean' ? stored.showMatchNames : DEFAULTS.showMatchNames,
      notifications: typeof stored.notifications === 'boolean' ? stored.notifications : DEFAULTS.notifications,
      hydrated: true,
    });
  },
  set: (patch) => {
    setState(patch);
    const { showMatchNames, notifications } = getState();
    const file = prefsFile();
    if (!file) return;
    FileSystem.writeAsStringAsync(file, JSON.stringify({ showMatchNames, notifications })).catch(() => {
      // Sin disco el ajuste vale hasta cerrar la app.
    });
  },
}));
