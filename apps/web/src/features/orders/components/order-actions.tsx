'use client';

import { orderCopy } from '@gymsheet/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LifeBuoy } from 'lucide-react';
import { queryKeys } from '@/shared/api/query-keys';
import type { BuyerOrderDetail } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';
import { confirm, notify } from '@/shared/notifications';
import { ReportDialog } from '@/features/moderation/components/report-dialog';
import { buyerOrdersService, orderErrorText } from '../services/orders-client';

/**
 * What else the buyer can do: cancel what has not been paid, and «Tengo un
 * problema con este pedido» (a PAYMENT_ORDER report for REPP), both only when
 * the backend's `actions` say so.
 */
export function OrderActions({ order }: Readonly<{ order: BuyerOrderDetail }>) {
  const client = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => buyerOrdersService.cancel(order.id),
    onSuccess: (updated) => {
      client.setQueryData(queryKeys.orders.detail(order.id), updated);
      void client.invalidateQueries({ queryKey: queryKeys.orders.list });
      notify.success('Pedido cancelado.');
    },
    onError: (error) => notify.error(orderErrorText(error)),
  });
  if (!order.actions.canCancel && !order.actions.canReport) return null;

  async function askCancel() {
    const answer = await confirm({
      title: orderCopy.cancel,
      message: order.method === 'CASH' ? 'El negocio deja de esperarte.' : 'Si ya pagaste, no canceles: envía el comprobante.',
      severity: 'danger',
      confirmLabel: orderCopy.cancel,
      cancelLabel: 'Volver',
    });
    if (answer.confirmed) cancel.mutate();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {order.actions.canCancel ? (
        <Button loading={cancel.isPending} onClick={() => void askCancel()} variant="ghost">
          {orderCopy.cancel}
        </Button>
      ) : null}
      {order.actions.canReport ? (
        <ReportDialog
          consequence={orderCopy.disputeConsequence}
          subjectName={`el pedido ${order.orderNumber}`}
          successMessage={orderCopy.disputeSent}
          targetId={order.id}
          targetKind="PAYMENT_ORDER"
          trigger={
            <Button variant="ghost">
              <LifeBuoy aria-hidden className="size-4" />
              {orderCopy.dispute}
            </Button>
          }
        />
      ) : null}
    </div>
  );
}
