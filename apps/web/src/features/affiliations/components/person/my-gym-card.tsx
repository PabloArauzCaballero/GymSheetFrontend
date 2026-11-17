'use client';

import { affiliationCopy, findGymWebHref, initials, myGymCardOf } from '@gymsheet/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import Link from 'next/link';
import { personAffiliationKeys } from '@/shared/api/query-keys';
import type { MyGym } from '@/shared/api/schemas';
import { DomainImage } from '@/shared/components/media/domain-image';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { confirm, notify } from '@/shared/notifications';
import { affiliationErrorText, personAffiliationsService } from '../../services/affiliations-client';

function useCloseAffiliation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ affiliationId, action }: { affiliationId: string; action: 'cancel' | 'end' }) =>
      action === 'cancel' ? personAffiliationsService.cancel(affiliationId) : personAffiliationsService.end(affiliationId),
    onSuccess: (_, { action }) => {
      for (const key of personAffiliationKeys()) void client.invalidateQueries({ queryKey: key });
      notify.success(action === 'cancel' ? 'Solicitud cancelada.' : 'Ya no eres socio de ese gimnasio.');
    },
    onError: (error) => notify.error(affiliationErrorText(error)),
  });
}

/**
 * The head of «Mi gimnasio» from `GET /me/gym` (plan §4.3): NONE explains and
 * sends to the marketplace, REQUESTED is «Solicitud enviada a X», CONFIRMED
 * shows the gym, the sede and since when.
 */
export function MyGymCard({ myGym }: Readonly<{ myGym: MyGym }>) {
  const card = myGymCardOf(myGym);
  const close = useCloseAffiliation();
  async function ask(affiliationId: string, action: 'cancel' | 'end', gymName: string) {
    const answer = await confirm(
      action === 'cancel'
        ? { title: '¿Cancelar la solicitud?', message: `${gymName} ya no la verá. Podrás volver a pedirla mañana.`, confirmLabel: affiliationCopy.cancel, cancelLabel: 'Volver' }
        : { title: `¿Dejar ${gymName}?`, message: 'Dejas de ver su clasificación y a sus socios, y tu sello desaparece.', confirmLabel: affiliationCopy.leave, cancelLabel: 'Quedarme', severity: 'danger' },
    );
    if (answer.confirmed) close.mutate({ affiliationId, action });
  }

  if (card.state === 'NONE') {
    return (
      <section className="panel grid justify-items-start gap-3 p-6" data-testid="my-gym-card" data-state="NONE">
        <Building2 aria-hidden className="size-8 text-[var(--text-muted)]" />
        <h2 className="t-headline">{card.title}</h2>
        <p className="t-subhead max-w-prose text-[var(--text-muted)]">{card.message}</p>
        <ButtonLink href={findGymWebHref} variant="primary">
          {card.action}
        </ButtonLink>
      </section>
    );
  }
  if (card.state === 'REQUESTED') {
    return (
      <section className="panel grid justify-items-start gap-3 p-6" data-testid="my-gym-card" data-state="REQUESTED">
        <p className="data-label text-[var(--info-text)]">{affiliationCopy.sent}</p>
        <h2 className="t-headline">{card.title}</h2>
        <p className="t-subhead max-w-prose text-[var(--text-muted)]">{card.message}</p>
        <div className="flex flex-wrap gap-2">
          {card.handle ? (
            <ButtonLink href={`/@${card.handle}`} size="sm" variant="ghost">
              Ver el gimnasio
            </ButtonLink>
          ) : null}
          <Button loading={close.isPending} onClick={() => void ask(card.affiliationId, 'cancel', card.gymName)} size="sm" variant="ghost">
            {affiliationCopy.cancel}
          </Button>
        </div>
      </section>
    );
  }
  return (
    <section className="panel grid gap-4 p-6" data-testid="my-gym-card" data-state="CONFIRMED">
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-high)]">
          {card.logoUrl ? <DomainImage alt="" className="size-full object-cover" src={card.logoUrl} /> : <span aria-hidden className="text-xl font-semibold">{initials(card.gymName)}</span>}
        </span>
        <div className="grid min-w-0 gap-0.5">
          <h2 className="title-text truncate">{card.gymName}</h2>
          <p className="t-subhead text-[var(--text-muted)]">{card.detail || card.title}</p>
          {card.handle ? (
            <Link className="t-footnote w-fit font-semibold underline-offset-4 hover:underline" href={`/@${card.handle}`} translate="no">
              @{card.handle}
            </Link>
          ) : null}
        </div>
      </div>
      {card.switching ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] bg-[var(--info-bg)] px-4 py-3 text-[var(--info-text)]">
          <p className="t-subhead">{`Pediste cambiarte a ${card.switching.gymName}. Sigues aquí hasta que te confirme.`}</p>
          <Button loading={close.isPending} onClick={() => void ask(card.switching?.affiliationId ?? '', 'cancel', card.switching?.gymName ?? '')} size="sm" variant="ghost">
            {affiliationCopy.cancel}
          </Button>
        </div>
      ) : null}
      {myGym.affiliationId ? (
        <Button className="justify-self-start" loading={close.isPending} onClick={() => void ask(myGym.affiliationId ?? '', 'end', card.gymName)} size="sm" variant="ghost">
          {affiliationCopy.leave}
        </Button>
      ) : null}
    </section>
  );
}
