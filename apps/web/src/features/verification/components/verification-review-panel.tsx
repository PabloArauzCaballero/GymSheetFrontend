'use client';

import {
  approveInput,
  gestureGlyph,
  rejectInput,
  verificationErrorKind,
  verificationGymLabel,
  verificationRejectionLabels,
  verificationReviewRefusal,
  verificationReviewCopy as copy,
} from '@gymsheet/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, RefreshCw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  verificationRejectionReasons,
  type DecideVerificationInput,
  type VerificationQueueItem,
  type VerificationRejectionReason,
} from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import { notify } from '@/shared/notifications';
import { selfieProxySrc, verificationService } from '../services/verification-service';
import { VerificationComparison } from './verification-comparison';

/**
 * The selfie next to the photos it is compared with, the gesture asked for,
 * and the decision. An approval names exactly the photos shown here; if the
 * gallery changed meanwhile the server answers 409 and nothing is decided.
 */
export function VerificationReviewPanel({
  item,
  onDone,
  onReload,
  reloading,
}: Readonly<{ item: VerificationQueueItem; onDone: () => void; onReload: () => void; reloading: boolean }>) {
  const queryClient = useQueryClient();
  const heading = useRef<HTMLHeadingElement>(null);
  const [reason, setReason] = useState<VerificationRejectionReason | ''>('');
  const [photosChanged, setPhotosChanged] = useState(false);
  const selfieSrc = item.selfie ? selfieProxySrc(item.selfie.url) : null;

  // Fresh photos after a reload clear the conflict (state adjusted during render).
  const photoKey = item.profilePhotos.map((photo) => photo.id).join(',');
  const [seenPhotos, setSeenPhotos] = useState(photoKey);
  if (photoKey !== seenPhotos) {
    setSeenPhotos(photoKey);
    setPhotosChanged(false);
  }

  // Keyboard users land on the item they opened.
  useEffect(() => heading.current?.focus(), []);

  const decide = useMutation({
    mutationFn: (input: DecideVerificationInput) => verificationService.decide(item.id, input),
    onSuccess: async (result) => {
      notify.success(result.status === 'APPROVED' ? copy.approved : copy.rejected);
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.verifications });
      onDone();
    },
    onError: async (error: Error) => {
      const kind = verificationErrorKind(error);
      if (kind === 'photosChanged') return setPhotosChanged(true);
      // Decided by someone else, expired, or a case this account may not take
      // (own selfie, a platform account): the item leaves the list either way.
      const refusal =
        verificationReviewRefusal(kind) ?? ((error as { status?: number }).status === 404 ? copy.alreadyDecided : null);
      if (!refusal) return notify.error(error);
      notify.info(refusal);
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.verifications });
      onDone();
    },
  });

  return (
    <div className="grid gap-5">
      <div className="grid gap-1">
        <h2 className="title-text outline-none" ref={heading} tabIndex={-1}>
          {item.member.name}
        </h2>
        <p className="t-footnote text-[var(--text-muted)]" data-testid="verification-gym">
          {verificationGymLabel(item)}
        </p>
        <p className="t-subhead flex items-center gap-2 text-[var(--text-muted)]">
          <span aria-hidden className="text-xl leading-none">{gestureGlyph(item.gesture)}</span>
          <span>
            <span className="sr-only">{copy.gesture}: </span>
            {item.gesture.instruction}
          </span>
        </p>
      </div>

      <VerificationComparison item={item} selfieSrc={selfieSrc} />

      {photosChanged ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] bg-[var(--warning-bg)] px-4 py-3" role="alert">
          <p className="t-subhead flex-1 text-[var(--warning-text)]">{copy.photosChanged}</p>
          <Button loading={reloading} onClick={onReload} size="sm" type="button" variant="ghost">
            <RefreshCw aria-hidden className="size-4" />
            {copy.reload}
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 border-t border-[var(--border-subtle)] pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="grid gap-1.5">
          <span className="t-footnote text-[var(--text-muted)]">{copy.reasonLabel}</span>
          <Select onChange={(event) => setReason(event.target.value as VerificationRejectionReason | '')} value={reason}>
            <option value="">Elige un motivo</option>
            {verificationRejectionReasons.map((code) => (
              <option key={code} value={code}>
                {verificationRejectionLabels[code]}
              </option>
            ))}
          </Select>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!reason || decide.isPending}
            loading={decide.isPending && decide.variables?.decision === 'REJECT'}
            onClick={() => reason && decide.mutate(rejectInput(reason))}
            type="button"
            variant="ghost"
          >
            <X aria-hidden className="size-4" />
            {copy.reject}
          </Button>
          <Button
            disabled={photosChanged || item.profilePhotos.length === 0 || decide.isPending}
            loading={decide.isPending && decide.variables?.decision === 'APPROVE'}
            onClick={() => decide.mutate(approveInput(item))}
            type="button"
            variant="primary"
          >
            <Check aria-hidden className="size-4" />
            {copy.approve}
          </Button>
        </div>
      </div>
    </div>
  );
}
