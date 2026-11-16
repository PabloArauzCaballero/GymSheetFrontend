/**
 * Runs a sheet's choice once the sheet is gone. iOS swallows a modal (the system photo picker, another
 * sheet) presented while the previous one is still dismissing, so there the choice waits for the
 * Modal's `onDismiss`, which only iOS fires; Android and web close at once and run it right away.
 */
export function afterSheetCloses<T>(os: string, run: (choice: T) => void) {
  let pending: { choice: T } | null = null;
  return {
    choose(choice: T) {
      if (os === 'ios') pending = { choice };
      else run(choice);
    },
    dismissed() {
      const next = pending;
      pending = null;
      if (next) run(next.choice);
    },
  };
}
