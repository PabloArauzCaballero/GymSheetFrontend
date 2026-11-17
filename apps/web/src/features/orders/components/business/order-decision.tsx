'use client';

import { orderCopy, orderRejectionLabels, rejectionNoteError } from '@gymsheet/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import { orderRejectionCodes, type BusinessOrderDetail, type OrderRejectionCode } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';
import { ChoiceChip } from '@/shared/components/ui/choice-chip';
import { Field } from '@/shared/components/ui/field';
import { Textarea } from '@/shared/components/ui/textarea';
import { confirm, notify } from '@/shared/notifications';
import { businessOrdersService, orderErrorText } from '../../services/orders-client';

/**
 * Confirmar o Rechazar (plan §4.2). Confirming asks once: it is the money in
 * the account. Rejecting takes a reason chip, and a note with «Otro motivo».
 * Either answer replaces the cached order and refreshes the inbox and badge.
 */
export function OrderDecision({ order }: Readonly<{ order: BusinessOrderDetail }>) {
  const client = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [code, setCode] = useState<OrderRejectionCode | null>(null);
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const settle = (updated: BusinessOrderDetail, message: string) => {
    client.setQueryData(queryKeys.business.order(order.id), updated);
    void client.invalidateQueries({ queryKey: queryKeys.business.orders, predicate: (query) => query.queryKey[3] !== 'detail' });
    notify.success(message);
  };
  const confirmPayment = useMutation({
    mutationFn: () => businessOrdersService.confirm(order.id),
    onSuccess: (updated) => settle(updated, 'Pago confirmado. Le avisamos a la persona.'),
    onError: (error) => notify.error(orderErrorText(error)),
  });
  const reject = useMutation({
    mutationFn: (reasonCode: OrderRejectionCode) => businessOrdersService.reject(order.id, { reasonCode, ...(note.trim() ? { note: note.trim() } : {}) }),
    onSuccess: (updated) => settle(updated, 'Pago rechazado. La persona ve el motivo.'),
  });
  const noteError = rejectionNoteError(code, note);

  async function askConfirm() {
    const answer = await confirm({ title: orderCopy.confirmQuestion, message: orderCopy.confirmBody, confirmLabel: orderCopy.confirmPayment, cancelLabel: 'Todavía no' });
    if (answer.confirmed) confirmPayment.mutate();
  }

  if (!order.actions.canDecide) return null;
  if (!rejecting) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <Button loading={confirmPayment.isPending} onClick={() => void askConfirm()} size="lg" variant="primary">
          {orderCopy.confirmPayment}
        </Button>
        <Button onClick={() => setRejecting(true)} size="lg" variant="ghost">
          {orderCopy.rejectPayment}
        </Button>
      </div>
    );
  }
  return (
    <form
      aria-labelledby="reject-title"
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (code && !noteError) reject.mutate(code);
      }}
    >
      <h3 className="t-headline" id="reject-title">¿Por qué lo rechazas?</h3>
      <div aria-label="Motivo" className="flex flex-wrap gap-2" role="group">
        {orderRejectionCodes.map((value) => (
          <ChoiceChip key={value} onClick={() => setCode(value)} selected={code === value}>
            {orderRejectionLabels[value]}
          </ChoiceChip>
        ))}
      </div>
      <Field error={tried && noteError ? noteError : undefined} hint={code === 'OTHER' ? 'Obligatoria con «Otro motivo».' : 'Opcional. La persona la lee.'} label="Nota para la persona">
        <Textarea maxLength={500} name="note" onChange={(event) => setNote(event.target.value)} rows={2} value={note} />
      </Field>
      {reject.error ? <p className="t-subhead text-[var(--danger-text)]" role="alert">{orderErrorText(reject.error)}</p> : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button onClick={() => setRejecting(false)} type="button" variant="ghost">Volver</Button>
        <Button loading={reject.isPending} type="submit" variant="danger">Rechazar pago</Button>
      </div>
    </form>
  );
}
