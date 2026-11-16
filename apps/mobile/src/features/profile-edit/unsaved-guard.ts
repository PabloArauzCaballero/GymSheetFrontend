import { createDirtyRegistry, unsavedChangesPrompt } from '@gymsheet/domain';
import { useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { confirm } from '@/notifications';

/** The edit screen's drafts (`apps/web/src/features/profile/lib/unsaved-guard.ts`): each section reports its own. */
export const editDrafts = createDirtyRegistry();

/** A section says whether it holds a draft; leaving the screen forgets it. */
export function useDraftReport(key: string, dirty: boolean) {
  useEffect(() => {
    editDrafts.set(key, dirty);
  }, [dirty, key]);
  useEffect(() => () => editDrafts.set(key, false), [key]);
}

/** Asks before dropping drafts; true when there is nothing to lose or the person chose to leave. */
export async function confirmDiscardDrafts(): Promise<boolean> {
  if (!editDrafts.any()) return true;
  const result = await confirm({ ...unsavedChangesPrompt, severity: 'warning' });
  if (result.confirmed) editDrafts.clear();
  return result.confirmed;
}

/**
 * Leaving with unsaved sections (Volver, the edge swipe, Android back): the
 * screen stays and asks first, with the app's own dialog.
 */
export function useLeaveGuard() {
  const navigation = useNavigation();
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (!editDrafts.any()) return;
        event.preventDefault();
        void confirmDiscardDrafts().then((leave) => {
          if (leave) navigation.dispatch(event.data.action);
        });
      }),
    [navigation],
  );
}
