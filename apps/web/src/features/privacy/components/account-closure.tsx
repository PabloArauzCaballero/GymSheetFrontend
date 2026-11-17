'use client';

import {
  accountClosureCopy,
  businessClosureCopy,
  closureBlockerFromError,
  closureBlockerNotices,
  closureProofOptions,
} from '@gymsheet/domain';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { CloseAccountInput } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonList } from '@/shared/components/feedback/skeleton';
import { Button } from '@/shared/components/ui/button';
import { confirm } from '@/shared/notifications';
import { closureErrorMessage } from '../lib/account-errors';
import { leaveClosedAccount, privacyService } from '../services/privacy-service';
import { BusinessClosureEffects, ClosureBlockers } from './closure-blockers';
import { ClosurePreviewList } from './closure-preview-list';
import { ClosureProofForm } from './closure-proof-form';

/**
 * «Cerrar mi cuenta»: first what the closure deletes, anonymizes and keeps
 * (and why), then the proof, then one last confirmation. On success the
 * session cookie is cleared and the person lands on the goodbye page.
 * `business` (ADR-0028): the effects on the listing, orders and members, and
 * the blockers (receipts to decide) in place of the proof while they last.
 */
export function AccountClosure({ business = false }: Readonly<{ business?: boolean }>) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = useQuery({
    queryKey: queryKeys.accountClosurePreview,
    queryFn: privacyService.closurePreview,
    enabled: open,
    staleTime: 0,
  });
  const sendPin = useMutation({
    mutationFn: () => privacyService.requestClosurePin(),
    onSuccess: () => setError(null),
    onError: (failure: Error) => setError(closureErrorMessage(failure)),
  });
  const close = useMutation({
    mutationFn: (input: CloseAccountInput) => privacyService.closeAccount(input),
    onSuccess: () => leaveClosedAccount(),
    onError: (failure: Error) => {
      setError(closureErrorMessage(failure));
      // A receipt arrived after the preview: read it again so the blocker shows with its way out.
      if (closureBlockerFromError(failure)) void preview.refetch();
    },
  });
  const copy = business ? businessClosureCopy : accountClosureCopy;

  async function submit(input: CloseAccountInput) {
    const answer = await confirm({
      title: copy.confirmTitle,
      message: copy.confirmMessage,
      severity: 'danger',
      confirmLabel: copy.confirmLabel,
    });
    if (answer.confirmed) close.mutate(input);
  }

  if (!open) {
    return (
      <div className="grid gap-3">
        <p className="t-subhead text-[var(--text-muted)]">{copy.description}</p>
        <Button className="justify-self-start" onClick={() => setOpen(true)} size="sm" variant="ghost">
          {accountClosureCopy.start}
        </Button>
      </div>
    );
  }
  if (preview.isLoading) return <SkeletonList rows={3} variant="stacked" />;
  if (preview.isError) {
    return <ErrorPanel error={preview.error} message={preview.error.message} onRetry={() => void preview.refetch()} />;
  }
  if (!preview.data) return null;
  if (!preview.data.allowed) {
    return <p className="t-subhead text-[var(--text-muted)]">{accountClosureCopy.notAllowed}</p>;
  }

  const blockers = closureBlockerNotices(preview.data);
  return (
    <div className="grid gap-5">
      <ClosureBlockers notices={blockers} />
      {business ? <BusinessClosureEffects effects={businessClosureCopy.effects} title={businessClosureCopy.effectsTitle} /> : null}
      <ClosurePreviewList preview={preview.data} />
      {blockers.length === 0 ? (
        <ClosureProofForm
          closing={close.isPending}
          error={error}
          onSendPin={() => sendPin.mutate()}
          onSubmit={(input) => void submit(input)}
          pinSent={sendPin.isSuccess}
          proofs={closureProofOptions(preview.data)}
          sendingPin={sendPin.isPending}
          submitLabel={copy.submit}
        />
      ) : null}
    </div>
  );
}
