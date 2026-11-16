/**
 * The edit screen's save model, shared by web and mobile: each section that
 * holds a draft saves with its own button, one-tap choices save on tap, and
 * both confirm in the same inline status line next to where the save happened.
 * A toast elsewhere on the screen is not proof the section was saved.
 */
export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'failed';

export function sectionSaveStatus({
  dirty,
  mutation,
}: {
  dirty: boolean;
  /** Last mutation status for this section (`useMutationState`), if any. */
  mutation: 'idle' | 'pending' | 'success' | 'error' | undefined;
}): SaveStatus {
  if (mutation === 'pending') return 'saving';
  if (dirty) return mutation === 'error' ? 'failed' : 'dirty';
  if (mutation === 'error') return 'failed';
  return mutation === 'success' ? 'saved' : 'idle';
}

/** What the status line says. `saved` is the section's own past tense («Bio guardada»). */
export function saveStatusLabel(status: SaveStatus, saved: string): string | null {
  switch (status) {
    case 'dirty':
      return 'Cambios sin guardar';
    case 'saving':
      return 'Guardando…';
    case 'saved':
      return saved;
    case 'failed':
      return 'No se guardó. Inténtalo de nuevo.';
    default:
      return null;
  }
}
