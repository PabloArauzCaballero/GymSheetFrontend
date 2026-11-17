'use client';

import { approveDecision, kycRejectionLabels, kycReviewCopy as copy, rejectInputOf } from '@gymsheet/domain';
import { useMutation } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { kycRejectionReasonCodes, type KycDecideInput, type KycRejectionReasonCode } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { ChoiceChip } from '@/shared/components/ui/choice-chip';
import { Textarea } from '@/shared/components/ui/textarea';
import { notify } from '@/shared/notifications';
import { businessKycAdminService } from '@/features/business/services/business-kyc-client';

/**
 * The decision: approve (or close the post-review of an automatic approval),
 * or reject with at least one reason and whether the business may correct
 * and resend. The internal note never reaches the business.
 */
export function KycDecisionForm({
  submissionId,
  status,
  disabled,
  onDecided,
  onRefused,
}: Readonly<{ submissionId: string; status: string; disabled: boolean; onDecided: () => void; onRefused: (error: unknown) => void }>) {
  const [reasons, setReasons] = useState<KycRejectionReasonCode[]>([]);
  const [allowResubmit, setAllowResubmit] = useState(true);
  const [note, setNote] = useState('');
  const approve = approveDecision(status);
  const decide = useMutation({
    mutationFn: (input: KycDecideInput) => businessKycAdminService.decide(submissionId, input),
    onSuccess: (result) => {
      notify.success(result.status === 'REJECTED' ? copy.rejected : copy.approved);
      onDecided();
    },
    onError: onRefused,
  });
  const toggle = (code: KycRejectionReasonCode) =>
    setReasons((current) => (current.includes(code) ? current.filter((entry) => entry !== code) : current.length < 6 ? [...current, code] : current));

  return (
    <section aria-labelledby="kyc-decision" className="grid gap-4 border-t border-[var(--border-subtle)] pt-5">
      <h3 className="t-headline" id="kyc-decision">
        Decisión
      </h3>
      <fieldset className="grid gap-2">
        <legend className="t-footnote mb-1 text-[var(--text-muted)]">{copy.reasonsLegend}</legend>
        <div className="flex flex-wrap gap-2">
          {kycRejectionReasonCodes.map((code) => (
            <ChoiceChip key={code} onClick={() => toggle(code)} selected={reasons.includes(code)}>
              {kycRejectionLabels[code]}
            </ChoiceChip>
          ))}
        </div>
      </fieldset>
      <Checkbox checked={allowResubmit} label={copy.allowResubmit} onChange={(event) => setAllowResubmit(event.target.checked)} />
      <Textarea aria-label={copy.note} maxLength={1000} onChange={(event) => setNote(event.target.value)} placeholder={copy.note} rows={2} value={note} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          disabled={disabled || reasons.length === 0 || decide.isPending}
          loading={decide.isPending && decide.variables?.decision === 'REJECT'}
          onClick={() => decide.mutate(rejectInputOf(reasons, allowResubmit, note))}
          type="button"
          variant="ghost"
        >
          <X aria-hidden className="size-4" />
          {copy.reject}
        </Button>
        <Button
          disabled={disabled || decide.isPending}
          loading={decide.isPending && decide.variables?.decision !== 'REJECT'}
          onClick={() => decide.mutate({ decision: approve, reasonCodes: [], ...(note.trim() ? { note: note.trim() } : {}) })}
          type="button"
          variant="primary"
        >
          <Check aria-hidden className="size-4" />
          {approve === 'POST_REVIEW_OK' ? copy.postReviewOk : copy.approve}
        </Button>
      </div>
    </section>
  );
}
