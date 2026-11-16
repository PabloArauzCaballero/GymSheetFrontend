import { Suspense, type ReactNode } from 'react';
import { DeniedNotice } from '@/shared/components/feedback/denied-notice';
import { PortalShell } from '@/shared/components/layout/portal-shell';
import { requireSession } from '@/shared/server/session';
import { getPendingLegalDocuments } from '@/shared/server/legal';
import { LegalGate } from '@/features/legal/components/legal-gate';
import { OnboardingGuard } from '@/features/onboarding/components/onboarding-guard';

export default async function PortalLayout({ children }: Readonly<{ children: ReactNode }>) {
  // In parallel: the legal check must not add a round trip to every portal load.
  const [session, pendingLegal] = await Promise.all([requireSession(), getPendingLegalDocuments()]);
  return (
    // Outside the onboarding guard: with documents pending, its own request would answer 428.
    <LegalGate initialPending={pendingLegal}>
      <OnboardingGuard role={session.role}>
        {/* `useSearchParams` obliga a un límite de Suspense; sin él, toda la ruta
            se renderiza en cliente. No pinta nada, así que no necesita fallback. */}
        <Suspense fallback={null}>
          <DeniedNotice />
        </Suspense>
        <PortalShell session={session}>{children}</PortalShell>
      </OnboardingGuard>
    </LegalGate>
  );
}
