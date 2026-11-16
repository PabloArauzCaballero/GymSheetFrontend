'use client';

import { createDirtyRegistry, unsavedChangesPrompt } from '@gymsheet/domain';
import { useRouter } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import { confirm } from '@/shared/notifications';

/** The edit page's drafts: each section reports its own; the page guards them as one. */
export const editDrafts = createDirtyRegistry();

/** A section says whether it holds a draft; leaving the page forgets it. */
export function useDraftReport(key: string, dirty: boolean) {
  useEffect(() => {
    editDrafts.set(key, dirty);
  }, [dirty, key]);
  useEffect(() => () => editDrafts.set(key, false), [key]);
}

/** Asks before dropping drafts; resolves true when there is nothing to lose or the person chose to leave. */
export async function confirmDiscardDrafts(): Promise<boolean> {
  if (!editDrafts.any()) return true;
  const result = await confirm({ ...unsavedChangesPrompt, severity: 'warning' });
  if (result.confirmed) editDrafts.clear();
  return result.confirmed;
}

/**
 * Leaving with unsaved sections: the browser asks on reload/close
 * (`beforeunload`), and an in-app link (header, tab bar, «Perfil») asks with
 * the app's own dialog first. Captured on the document so it runs before the
 * link's own navigation.
 */
export function useLeaveGuard() {
  const router = useRouter();
  const dirty = useSyncExternalStore(editDrafts.subscribe, editDrafts.any, () => false);
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href]');
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank' || event.metaKey || event.ctrlKey) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      event.preventDefault();
      event.stopPropagation();
      void confirmDiscardDrafts().then((leave) => {
        if (leave) router.push(`${url.pathname}${url.search}${url.hash}`);
      });
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty, router]);
}
