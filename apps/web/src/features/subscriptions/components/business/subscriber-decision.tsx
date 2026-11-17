'use client';

import { affiliationNoteError, cancelReasonOrder, subscriptionCopy, subscriptionReasonLabels, suspendReasonOrder } from '@gymsheet/domain';
import { replaceInPages, type CursorPages } from '@gymsheet/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import type { Subscriber, SubscriptionCancelReason, SubscriptionReason, SubscriptionSuspendReason } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';
import { ChoiceChip } from '@/shared/components/ui/choice-chip';
import { Field } from '@/shared/components/ui/field';
import { Textarea } from '@/shared/components/ui/textarea';
import { confirm, notify } from '@/shared/notifications';
import { businessSubscriptionsService, subscriptionErrorText } from '../../services/subscriptions-client';

type Mode = 'cancel' | 'suspend';

/** A write's answer replaces its row in every loaded filter, then the lists re-read in the background. */
function useSettle() {
  const client = useQueryClient();
  return (row: Subscriber, message: string) => {
    client.setQueriesData<CursorPages<Subscriber>>({ queryKey: queryKeys.business.subscribers }, (data) => replaceInPages(data, row));
    void client.invalidateQueries({ queryKey: queryKeys.business.subscribers });
    notify.success(message);
  };
}

/** Cancel (final) or suspend with a reason chip; «Otro motivo» needs a note the person reads. */
function ReasonForm({ row, mode, onBack }: Readonly<{ row: Subscriber; mode: Mode; onBack: () => void }>) {
  const settle = useSettle();
  const [code, setCode] = useState<SubscriptionReason | null>(null);
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const noteError = affiliationNoteError(code, note);
  const codes: readonly SubscriptionReason[] = mode === 'cancel' ? cancelReasonOrder : suspendReasonOrder;
  const decide = useMutation({
    mutationFn: (reasonCode: SubscriptionReason) => {
      const extra = note.trim() ? { note: note.trim() } : {};
      return mode === 'cancel'
        ? businessSubscriptionsService.cancel(row.id, { reasonCode: reasonCode as SubscriptionCancelReason, ...extra })
        : businessSubscriptionsService.suspend(row.id, { reasonCode: reasonCode as SubscriptionSuspendReason, ...extra });
    },
    onSuccess: (updated) => {
      settle(updated, mode === 'cancel' ? subscriptionCopy.cancelled : subscriptionCopy.suspended);
      // The decision is done: back to the row, which now offers what its new status allows («Reactivar»).
      onBack();
    },
  });
  const titleId = `subscriber-reason-${row.id}`;
  return (
    <form
      aria-labelledby={titleId}
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (code && !noteError) decide.mutate(code);
      }}
    >
      <div className="grid gap-1">
        <h3 className="t-headline" id={titleId}>
          {mode === 'cancel' ? subscriptionCopy.cancelTitle : subscriptionCopy.suspendTitle}
        </h3>
        <p className="t-footnote text-[var(--text-muted)]">{mode === 'cancel' ? subscriptionCopy.cancelFinal : subscriptionCopy.suspendHint}</p>
      </div>
      <div aria-label="Motivo" className="flex flex-wrap gap-2" role="group">
        {codes.map((value) => (
          <ChoiceChip key={value} onClick={() => setCode(value)} selected={code === value}>
            {subscriptionReasonLabels[value]}
          </ChoiceChip>
        ))}
      </div>
      <Field error={tried && noteError ? noteError : undefined} hint={code === 'OTHER' ? 'Obligatoria con «Otro motivo».' : 'Opcional. La persona la lee.'} label="Nota para la persona">
        <Textarea maxLength={500} name="note" onChange={(event) => setNote(event.target.value)} rows={2} value={note} />
      </Field>
      {decide.error ? (
        <p className="t-subhead text-[var(--danger-text)]" role="alert">
          {subscriptionErrorText(decide.error)}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button onClick={onBack} type="button" variant="ghost">
          Volver
        </Button>
        <Button loading={decide.isPending} type="submit" variant="danger">
          {mode === 'cancel' ? subscriptionCopy.cancel : 'Suspender plan'}
        </Button>
      </div>
    </form>
  );
}

/** «Suspender» and «Cancelar plan» while it runs, «Reactivar» once suspended (the backend's `actions`). */
export function SubscriberDecision({ row }: Readonly<{ row: Subscriber }>) {
  const settle = useSettle();
  const [mode, setMode] = useState<Mode | null>(null);
  const reactivate = useMutation({
    mutationFn: () => businessSubscriptionsService.reactivate(row.id),
    onSuccess: (updated) => settle(updated, subscriptionCopy.reactivated),
    onError: (error) => notify.error(subscriptionErrorText(error)),
  });
  async function askReactivate() {
    const answer = await confirm({ title: `¿Reactivas el plan de ${row.subscriber.displayName}?`, message: 'Vuelve a estar activo hasta su fecha de fin.', confirmLabel: subscriptionCopy.reactivate, cancelLabel: 'Todavía no' });
    if (answer.confirmed) reactivate.mutate();
  }
  if (mode) return <ReasonForm mode={mode} onBack={() => setMode(null)} row={row} />;
  const { canCancel, canSuspend, canReactivate } = row.actions;
  if (!canCancel && !canSuspend && !canReactivate) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {canReactivate ? (
        <Button loading={reactivate.isPending} onClick={() => void askReactivate()} size="sm" variant="primary">
          {subscriptionCopy.reactivate}
        </Button>
      ) : null}
      {canSuspend ? (
        <Button onClick={() => setMode('suspend')} size="sm" variant="ghost">
          {subscriptionCopy.suspend}
        </Button>
      ) : null}
      {canCancel ? (
        <Button onClick={() => setMode('cancel')} size="sm" variant="ghost">
          {subscriptionCopy.cancel}
        </Button>
      ) : null}
    </div>
  );
}
