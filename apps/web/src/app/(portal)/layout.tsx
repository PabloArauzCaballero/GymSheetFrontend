import { Suspense, type ReactNode } from 'react';
import { DeniedNotice } from '@/shared/components/feedback/denied-notice';
import { PortalShell } from '@/shared/components/layout/portal-shell';
import { requireSession } from '@/shared/server/session';
import { OnboardingGuard } from '@/features/onboarding/components/onboarding-guard';

export default async function PortalLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await requireSession();
  return (
    <OnboardingGuard role={session.role}>
      {/* `useSearchParams` obliga a un límite de Suspense; sin él, toda la ruta
          se renderiza en cliente. No pinta nada, así que no necesita fallback. */}
      <Suspense fallback={null}>
        <DeniedNotice />
      </Suspense>
      <PortalShell session={session}>{children}</PortalShell>
    </OnboardingGuard>
  );
}
