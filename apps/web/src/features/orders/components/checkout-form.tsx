'use client';

import { ApiError } from '@gymsheet/api-client';
import { formatMoney, isGymMembership, joinGymErrors, maxOrderQuantity, multiplyMoney, needsSocioStep, orderCopy, subscriptionCopy, type JoinGymForm } from '@gymsheet/domain';
import { useQuery } from '@tanstack/react-query';
import { Minus, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import type { OrderMethod, PublicListing } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';
import { DialogClose } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import { Textarea } from '@/shared/components/ui/textarea';
import { personAffiliationsService } from '@/features/affiliations/services/affiliations-client';
import { marketplaceService } from '@/features/business-listings/services/listings-client';
import { subscriptionErrorText } from '@/features/subscriptions/services/subscriptions-client';
import { orderErrorCode } from '../services/orders-client';
import { SocioStep } from './socio-step';
import { useCheckout } from './use-checkout';

const METHODS: ReadonlyArray<{ value: OrderMethod; title: string; hint: string }> = [
  { value: 'QR', title: orderCopy.payQr, hint: orderCopy.payQrHint },
  { value: 'CASH', title: orderCopy.payCash, hint: orderCopy.payCashHint },
];

/** The gym's sedes for «Hazte socio», from its public profile (null while loading). */
function useGymLocations(handle: string | null, enabled: boolean) {
  const profile = useQuery({ queryKey: queryKeys.marketplace.profile(handle ?? ''), queryFn: () => marketplaceService.profile(handle ?? ''), enabled: enabled && Boolean(handle) });
  if (!handle || profile.isError) return [];
  return profile.data && 'locations' in profile.data ? profile.data.locations : null;
}

/**
 * The checkout (plan §4.3): what you buy, how many (products only) and how you
 * pay; for a gym membership without SOCIO there, step 2 «Hazte socio» (sede +
 * 3 CI digits). The price comes from the listing on the server; the body
 * carries no amount. On success the order page takes over (QR, receipt, timeline).
 */
export function CheckoutForm({ listing }: Readonly<{ listing: PublicListing }>) {
  const max = maxOrderQuantity(listing.offerKind);
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState<OrderMethod>('QR');
  const [note, setNote] = useState('');
  const [step, setStep] = useState<'confirm' | 'socio'>('confirm');
  const [socio, setSocio] = useState<JoinGymForm>({ kind: 'SOCIO', locationId: '', ciLast3: '' });
  const [tried, setTried] = useState(false);
  const gymMembership = isGymMembership(listing);
  const myGym = useQuery({ queryKey: queryKeys.myGym, queryFn: personAffiliationsService.myGym, enabled: gymMembership, staleTime: 30_000 });
  const locations = useGymLocations(listing.seller.handle, step === 'socio');
  // A gym with a single sede preselects it: one decision less.
  const socioForm = { ...socio, locationId: socio.locationId || (locations?.length === 1 ? (locations[0]?.id ?? '') : '') };
  const { create, error } = useCheckout({ gymName: listing.seller.name, onNeedsSocio: () => setStep('socio') });
  const askSocio = step === 'confirm' && needsSocioStep(listing, myGym.data);
  const shownError = step === 'socio' && orderErrorCode(error) === 'AFFILIATION_REQUIRED' ? null : error;
  const openOrderId = orderErrorCode(error) === 'ORDER_ALREADY_OPEN' && error instanceof ApiError ? String(error.details?.orderId ?? '') : '';

  function submit() {
    if (askSocio) return setStep('socio');
    const draft = { listingId: listing.id, method, ...(max > 1 ? { quantity } : {}), ...(note.trim() ? { note: note.trim() } : {}) };
    if (step === 'confirm') return create.mutate({ draft, socio: null, switchGym: false });
    setTried(true);
    if (locations && Object.keys(joinGymErrors(socioForm, locations)).length === 0) create.mutate({ draft, socio: socioForm, switchGym: false });
  }

  return (
    <form
      className="grid gap-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-1 rounded-[var(--radius-lg)] bg-[var(--surface)] p-4">
        <p className="font-semibold">{listing.name}</p>
        <p className="t-subhead text-[var(--text-muted)]">{listing.seller.name}</p>
        <p className="title-text mt-1 tabular-nums">{formatMoney(multiplyMoney(listing.price, quantity), listing.currency)}</p>
        {quantity > 1 ? <p className="t-footnote tabular-nums text-[var(--text-muted)]">{formatMoney(listing.price, listing.currency)} por unidad</p> : null}
      </div>

      {step === 'socio' ? (
        <SocioStep form={socioForm} locations={locations} onChange={(patch) => setSocio((current) => ({ ...current, ...patch }))} tried={tried} />
      ) : null}

      {step === 'confirm' && max > 1 ? (
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

      <fieldset className="grid gap-2" hidden={step === 'socio'}>
        <legend className="data-label mb-2">Cómo pagas</legend>
        {METHODS.map((option) => (
          <label className="choice-card gap-1 rounded-[var(--radius-lg)] px-4 py-3" key={option.value}>
            <input checked={method === option.value} className="sr-only" name="method" onChange={() => setMethod(option.value)} type="radio" value={option.value} />
            <span className="text-[17px] font-semibold">{option.title}</span>
            <span className="t-subhead text-[var(--text-muted)]">{option.hint}</span>
          </label>
        ))}
      </fieldset>

      {step === 'confirm' ? (
        <Field hint="Una talla, un horario para retirar. Lo demás lo coordinas con el negocio." label="Nota para el negocio (opcional)">
          <Textarea maxLength={500} name="note" onChange={(event) => setNote(event.target.value)} rows={2} value={note} />
        </Field>
      ) : null}

      {shownError ? (
        <div className="grid gap-2 rounded-[var(--radius-lg)] bg-[var(--danger-bg)] p-4 text-[var(--danger-text)]" role="alert">
          <p className="t-subhead font-semibold">{subscriptionErrorText(shownError)}</p>
          {openOrderId ? (
            <Link className="t-subhead font-semibold underline underline-offset-4" href={`/profile/compras/${openOrderId}`}>
              Abrir tu pedido
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {step === 'socio' ? (
          <Button onClick={() => setStep('confirm')} type="button" variant="ghost">
            {subscriptionCopy.socioBack}
          </Button>
        ) : (
          <DialogClose asChild>
            <Button type="button" variant="ghost">Volver</Button>
          </DialogClose>
        )}
        <Button loading={create.isPending} type="submit" variant="primary">
          {askSocio ? 'Continuar' : orderCopy.confirm}
        </Button>
      </div>
      <p className="t-footnote text-[var(--text-muted)]">Pagas directo al negocio y él confirma. REPP no cobra ni devuelve pagos.</p>
    </form>
  );
}
