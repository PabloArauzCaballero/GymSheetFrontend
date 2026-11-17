'use client';

import { verificationCopy, verificationView } from '@gymsheet/domain';
import { RefreshCw, ScanFace } from 'lucide-react';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Skeleton } from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { useCountdown } from '../hooks/use-countdown';
import { useVerificationFlow } from '../hooks/use-verification-flow';
import { ChallengeCard } from './challenge-card';
import { SelfieCapture } from './selfie-capture';
import { VerificationStatusView } from './verification-status-view';

/**
 * `/verificacion`: consent → gesture with its deadline → selfie (camera or
 * file) → preview → upload → «en revisión». The server status decides what
 * shows; a reload resumes an open gesture.
 */
export function VerificationFlow() {
  const flow = useVerificationFlow();
  const seconds = useCountdown(flow.challenge?.expiresAt ?? null);
  const expired = Boolean(flow.challenge) && (seconds === 0 || flow.expiredByServer);

  return (
    <div className="mx-auto grid w-full max-w-xl gap-6">
      <PageHeader description={verificationCopy.pageIntro} title={verificationCopy.pageTitle} />
      {renderStep()}
    </div>
  );

  function renderStep() {
    if (flow.unavailable) {
      return (
        <VerificationStatusView
          view={{ tone: 'neutral', title: verificationCopy.unavailableTitle, body: verificationCopy.unavailableBody }}
        />
      );
    }
    if (flow.challenge && expired) {
      return (
        <VerificationStatusView
          action={
            <Button loading={flow.busy === 'start'} onClick={() => void flow.start()} type="button" variant="primary">
              <RefreshCw aria-hidden className="size-4" />
              {verificationCopy.newChallenge}
            </Button>
          }
          view={{ tone: 'neutral', title: verificationCopy.expiredTitle, body: verificationCopy.expiredBody }}
        />
      );
    }
    if (flow.challenge) {
      return (
        <>
          <ChallengeCard gesture={flow.challenge.gesture} seconds={seconds} />
          <SelfieCapture
            disabled={flow.busy !== null}
            onSend={(blob, name) => void flow.upload(blob, name)}
            sending={flow.busy === 'upload'}
          />
        </>
      );
    }
    if (flow.status.isPending) return <Skeleton className="h-64 rounded-[var(--radius-2xl)]" />;
    if (flow.status.isError) {
      return <ErrorPanel error={flow.status.error} message={flow.status.error.message} onRetry={() => void flow.status.refetch()} />;
    }
    const view = verificationView(flow.status.data);
    return (
      <VerificationStatusView
        action={
          view.canStart ? (
            <Button loading={flow.busy === 'start'} onClick={() => void flow.start()} type="button" variant="primary">
              <ScanFace aria-hidden className="size-4" />
              {flow.status.data.status === 'NONE' ? verificationCopy.start : verificationCopy.retry}
            </Button>
          ) : flow.status.data.status === 'APPROVED' ? (
            <ButtonLink href="/comunidad" size="sm">
              {verificationCopy.goToConocer}
            </ButtonLink>
          ) : null
        }
        view={view}
      />
    );
  }
}
