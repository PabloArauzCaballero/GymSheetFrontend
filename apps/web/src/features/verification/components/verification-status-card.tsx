'use client';

import { verificationCopy, verificationView } from '@gymsheet/domain';
import { BadgeCheck } from 'lucide-react';
import { Skeleton } from '@/shared/components/feedback/skeleton';
import { Section } from '@/shared/components/mobile/section';
import { ButtonLink } from '@/shared/components/ui/button';
import { useMyVerification } from '../hooks/use-verification-flow';
import { VerificationStatusView } from './verification-status-view';

/** «Verificación» in Ajustes: the state in words, with the way in when there is something to do. */
export function VerificationStatusCard() {
  const status = useMyVerification();
  return (
    <Section icon={BadgeCheck} title="Verificación">
      <div className="panel px-5 py-4">
        {status.isPending ? (
          <Skeleton className="h-14" tone="high" />
        ) : status.isError ? (
          <p className="t-subhead text-[var(--text-muted)]">No se pudo cargar tu verificación.</p>
        ) : (
          <VerificationStatusView
            action={
              verificationView(status.data).canStart ? (
                <ButtonLink href="/verificacion" size="sm">
                  {verificationCopy.ctaAction}
                </ButtonLink>
              ) : null
            }
            compact
            view={verificationView(status.data)}
          />
        )}
      </div>
    </Section>
  );
}
