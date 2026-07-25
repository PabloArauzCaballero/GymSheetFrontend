import type { ReactNode } from 'react';
import { PortalShell } from '@/shared/components/layout/portal-shell';
import { requireSession } from '@/shared/server/session';
import { OnboardingGuard } from '@/features/onboarding/components/onboarding-guard';

export default async function PortalLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await requireSession();
  return (
    <OnboardingGuard role={session.role}>
      <PortalShell session={session}>{children}</PortalShell>
    </OnboardingGuard>
  );
}
