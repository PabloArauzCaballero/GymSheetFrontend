'use client';

import { ApiError } from '@gymsheet/api-client';
import { formatMoney, maxOrderQuantity, multiplyMoney, orderCopy } from '@gymsheet/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import type { OrderMethod, PublicListing } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';
import { DialogClose } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import { Textarea } from '@/shared/components/ui/textarea';
import { buyerOrdersService, orderErrorCode, orderErrorText } from '../services/orders-client';

const METHODS: ReadonlyArray<{ value: OrderMethod; title: string; hint: string }> = [
  { value: 'QR', title: orderCopy.payQr, hint: orderCopy.payQrHint },
  { value: 'CASH', title: orderCopy.payCash, hint: orderCopy.payCashHint },
];

/**
 * Step 1 of the checkout (plan §4.3): what you buy, how many (products only)
 * and how you pay. The price comes from the listing on the server; the body
 * carries no amount. On success the order page takes over (QR, receipt, timeline).
 */
export function CheckoutForm({ listing }: Readonly<{ listing: PublicListing }>) {
  const router = useRouter();
  const client = useQueryClient();
  const max = maxOrderQuantity(listing.offerKind);
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState<OrderMethod>('QR');
  const [note, setNote] = useState('');
  const create = useMutation({
    mutationFn: () =>
      buyerOrdersService.create({
        listingId: listing.id,
        method,
        ...(max > 1 ? { quantity } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      }),
    onSuccess: (order) => {
      client.setQueryData(queryKeys.orders.detail(order.id), order);
      void client.invalidateQueries({ queryKey: queryKeys.orders.list });
      router.push(`/profile/compras/${order.id}`);
    },
  });
  const openOrderId = orderErrorCode(create.error) === 'ORDER_ALREADY_OPEN' && create.error instanceof ApiError ? String(create.error.details?.orderId ?? '') : '';

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate();
      }}
    >
      <div className="grid gap-1 rounded-[var(--radius-lg)] bg-[var(--surface)] p-4">
        <p className="font-semibold">{listing.name}</p>
        <p className="t-subhead text-[var(--text-muted)]">{listing.seller.name}</p>
        <p className="title-text mt-1 tabular-nums">{formatMoney(multiplyMoney(listing.price, quantity), listing.currency)}</p>
        {quantity > 1 ? <p className="t-footnote tabular-nums text-[var(--text-muted)]">{formatMoney(listing.price, listing.currency)} por unidad</p> : null}
      </div>

      {max > 1 ? (
        <div className="flex items-center justify-between gap-4">
          <span className="font-semibold" id="checkout-quantity">Cantidad</span>
          <div aria-labelledby="checkout-quantity" className="flex items-center gap-2" role="group">
            <Button aria-label="Una menos" disabled={quantity <= 1} onClick={() => setQuantity((value) => value - 1)} size="icon" type="button" variant="ghost">
              <Minus aria-hidden className="size-4" />
            </Button>
            <output aria-live="polite" className="min-w-8 text-center text-[17px] font-semibold tabular-nums">{quantity}</output>
            <Button aria-label="Una más" disabled={quantity >= max} onClick={() => setQuantity((value) => value + 1)} size="icon" type="button" variant="ghost">
              <Plus aria-hidden className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <fieldset className="grid gap-2">
        <legend className="data-label mb-2">Cómo pagas</legend>
        {METHODS.map((option) => (
          <label className="choice-card gap-1 rounded-[var(--radius-lg)] px-4 py-3" key={option.value}>
            <input checked={method === option.value} className="sr-only" name="method" onChange={() => setMethod(option.value)} type="radio" value={option.value} />
            <span className="text-[17px] font-semibold">{option.title}</span>
            <span className="t-subhead text-[var(--text-muted)]">{option.hint}</span>
          </label>
        ))}
      </fieldset>

      <Field hint="Una talla, un horario para retirar. Lo demás lo coordinas con el negocio." label="Nota para el negocio (opcional)">
        <Textarea maxLength={500} name="note" onChange={(event) => setNote(event.target.value)} rows={2} value={note} />
      </Field>

      {create.error ? (
        <div className="grid gap-2 rounded-[var(--radius-lg)] bg-[var(--danger-bg)] p-4 text-[var(--danger-text)]" role="alert">
          <p className="t-subhead font-semibold">{orderErrorText(create.error)}</p>
          {openOrderId ? (
            <Link className="t-subhead font-semibold underline underline-offset-4" href={`/profile/compras/${openOrderId}`}>
              Abrir tu pedido
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button type="button" variant="ghost">Volver</Button>
        </DialogClose>
        <Button loading={create.isPending} type="submit" variant="primary">
          {orderCopy.confirm}
        </Button>
      </div>
      <p className="t-footnote text-[var(--text-muted)]">Pagas directo al negocio y él confirma. REPP no cobra ni devuelve pagos.</p>
    </form>
  );
}
