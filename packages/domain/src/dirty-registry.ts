/**
 * Which sections of a form screen hold unsaved changes. Each section reports
 * its own draft (`set`), the screen asks once (`any`) before anything that
 * would drop those drafts: leaving, reloading, switching to the preview.
 * Shared by web and mobile; subscribe for `useSyncExternalStore`.
 */
export function createDirtyRegistry() {
  const dirty = new Set<string>();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  return {
    set(key: string, isDirty: boolean) {
      const had = dirty.has(key);
      if (isDirty === had) return;
      if (isDirty) dirty.add(key);
      else dirty.delete(key);
      emit();
    },
    any: () => dirty.size > 0,
    keys: () => [...dirty],
    clear() {
      if (!dirty.size) return;
      dirty.clear();
      emit();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type DirtyRegistry = ReturnType<typeof createDirtyRegistry>;

/** The question asked before dropping drafts, in the same words on both platforms. */
export const unsavedChangesPrompt = {
  title: 'Tienes cambios sin guardar',
  message: 'Si sales ahora, se pierden. Guarda cada sección con su botón antes de salir.',
  confirmLabel: 'Descartar',
  cancelLabel: 'Seguir editando',
} as const;
