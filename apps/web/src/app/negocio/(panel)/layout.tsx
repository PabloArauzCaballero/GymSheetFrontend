import type { ReactNode } from 'react';
import { LegalGate } from '@/features/legal/components/legal-gate';
import { BusinessShell } from '@/features/business/components/business-shell';
import { requireBusinessSession } from '@/shared/server/business-session';
import { getPendingLegalDocuments } from '@/shared/server/legal';

/** The business portal: business sessions only (a person goes home), behind the legal gate like the person portal. */
export default async function BusinessPanelLayout({ children }: Readonly<{ children: ReactNode }>) {
  const [session, pendingLegal] = await Promise.all([requireBusinessSession(), getPendingLegalDocuments()]);
  return (
    <LegalGate initialPending={pendingLegal}>
      <BusinessShell accountName={session.nombreCompleto ?? session.email}>{children}</BusinessShell>
    </LegalGate>
  );
}
