'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import type { LegalDocumentVersion } from '@/shared/api/schemas';
import { fetchPendingLegal } from '@/features/auth/services/auth-client';
import { isLegalAcceptanceRequired } from '@/features/legal/lib/legal-documents';
import { LegalAcceptanceScreen } from './legal-acceptance-screen';

/**
 * Blocks the portal while the account lacks a current legal document, for
 * every role (staff included): the backend answers 428 to all their calls.
 *
 * Two entry points:
 * - `initialPending`, resolved by the portal layout on the server, so a page
 *   load never paints a portal that is about to fail;
 * - any query or mutation that fails with 428 LEGAL_ACCEPTANCE_REQUIRED while
 *   the portal is open (a version bump mid-session). Listening to the query
 *   client's caches catches them all without touching each screen.
 *
 * The portal is unmounted while blocked; once accepted it remounts and every
 * failed query is fetched again.
 */
export function LegalGate({
  initialPending,
  children,
}: Readonly<{ initialPending: readonly LegalDocumentVersion[]; children: ReactNode }>) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [pending, setPending] = useState<readonly LegalDocumentVersion[]>(initialPending);

  useEffect(() => {
    let checking = false;
    const recheck = (error: unknown) => {
      if (checking || !isLegalAcceptanceRequired(error)) return;
      checking = true;
      fetchPendingLegal()
        .then((next) => setPending(next))
        // Without the list there is nothing to accept; the next 428 tries again.
        .catch(() => undefined)
        .finally(() => {
          checking = false;
        });
    };
    const stopQueries = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'error') recheck(event.action.error);
    });
    const stopMutations = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'error') recheck(event.action.error);
    });
    return () => {
      stopQueries();
      stopMutations();
    };
  }, [queryClient]);

  if (pending.length === 0) return children;

  return (
    <LegalAcceptanceScreen
      onAccepted={() => {
        setPending([]);
        // Server components fetched with the blocked session; client queries failed with 428.
        router.refresh();
        void queryClient.invalidateQueries();
      }}
      onPendingChanged={setPending}
      pending={pending}
    />
  );
}
