import type {
  MyGym,
  MySubscriptions,
  Subscriber,
  SubscriptionLine,
  SubscriptionLineStatus,
  SubscriptionPeriod,
} from '@gymsheet/schemas';

/**
 * Unified subscriptions (franja 8e, backend ADR-0026) as the person and the
 * business read them. The server computes every status and day count; this
 * file only words them. Dates are calendar days (`YYYY-MM-DD`), formatted
 * without a time zone so a day never shifts.
 */

export type SubscriptionTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

// Calendar days carry no instant: formatted at UTC so the day never shifts with the viewer's zone.
const dayMonth = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const dayMonthYear = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** `2026-12-16` → `16 de diciembre`; the year only when it is not `today`'s. */
export function formatDayMonth(dateOnly: string, today?: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(dateOnly);
  if (!match) return dateOnly;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return (today && today.slice(0, 4) !== match[1] ? dayMonthYear : dayMonth).format(date);
}

const CHIPS: Readonly<Record<SubscriptionLineStatus, { label: string; tone: SubscriptionTone }>> = {
  UPCOMING: { label: 'Próxima', tone: 'info' },
  ACTIVE: { label: 'Activa', tone: 'success' },
  EXPIRING: { label: 'Por vencer', tone: 'warning' },
  EXPIRED: { label: 'Vencida', tone: 'neutral' },
  SUSPENDED: { label: 'Suspendida', tone: 'warning' },
  CANCELLED: { label: 'Cancelada', tone: 'danger' },
  PENDING: { label: 'Pago en curso', tone: 'info' },
};

export function subscriptionChip(status: SubscriptionLineStatus): { label: string; tone: SubscriptionTone } {
  return CHIPS[status];
}

/** «Quedan 12 días», «Vence hoy»; null without an end date or once it ended. */
export function daysLeftText(period: Pick<SubscriptionPeriod, 'status' | 'daysLeft'>): string | null {
  if (period.daysLeft === null || period.status === 'EXPIRED' || period.status === 'CANCELLED' || period.status === 'UPCOMING') return null;
  if (period.daysLeft === 0) return 'Vence hoy';
  return period.daysLeft === 1 ? 'Queda 1 día' : `Quedan ${period.daysLeft} días`;
}

/** «Del 17 de noviembre al 16 de diciembre», «Desde el 17 de noviembre» without an end. */
export function periodRangeText(period: Pick<SubscriptionPeriod, 'startsOn' | 'endsOn'>, today?: string): string {
  const from = formatDayMonth(period.startsOn, today);
  return period.endsOn ? `Del ${from} al ${formatDayMonth(period.endsOn, today)}` : `Desde el ${from}`;
}

/** «Usaste 3 de 10 sesiones». */
export function sessionsText(sessions: SubscriptionPeriod['sessions']): string | null {
  if (!sessions) return null;
  return sessions.total === 1 ? (sessions.used >= 1 ? 'Sesión usada' : '1 sesión') : `Usaste ${sessions.used} de ${sessions.total} sesiones`;
}

/** The period a line opens in detail: the running one, else the chained renewal. */
export function linePeriodId(line: Pick<SubscriptionLine, 'current' | 'upcoming'>): string | null {
  return line.current?.id ?? line.upcoming?.id ?? null;
}

/** «Renovar» goes to the listing while it is still on sale. */
export function renewListingId(line: Pick<SubscriptionLine, 'renew'>): string | null {
  return line.renew?.available ? line.renew.listingId : null;
}

/** The last day covered, counting a renewal already chained after the running period. */
export function coveredUntil(line: Pick<SubscriptionLine, 'current' | 'upcoming'>): string | null {
  return line.upcoming?.endsOn ?? line.current?.endsOn ?? null;
}

const LIVE: readonly SubscriptionLineStatus[] = ['ACTIVE', 'EXPIRING', 'UPCOMING'];

/** The line of the gym's MEMBERSHIP inside «Mis suscripciones», if the person bought one. */
export function gymMembershipLine(data: MySubscriptions | undefined, gymEntityId: string | null | undefined): SubscriptionLine | null {
  if (!data || !gymEntityId) return null;
  const group = data.items.find((item) => item.seller?.entityId === gymEntityId);
  const lines = group?.subscriptions.filter((line) => line.listing.offerKind === 'MEMBERSHIP') ?? [];
  return lines.find((line) => LIVE.includes(line.status)) ?? lines.find((line) => line.status === 'PENDING') ?? lines[0] ?? null;
}

/**
 * The plan line of «Mi gimnasio» (plan §2.10): «Socio activo hasta …»,
 * «Socio · plan vencido» or «Solicitud enviada». Null with no gym at all.
 */
export function myGymPlanText(myGym: MyGym | undefined, data: MySubscriptions | undefined): { label: string; tone: SubscriptionTone } | null {
  if (!myGym) return null;
  if (myGym.status !== 'CONFIRMED' || !myGym.gym) return myGym.pendingRequest ? { label: 'Solicitud enviada', tone: 'info' } : null;
  const line = gymMembershipLine(data, myGym.gym.id);
  if (!line) return data ? { label: 'Socio · sin plan', tone: 'neutral' } : null;
  if (LIVE.includes(line.status)) {
    const until = coveredUntil(line);
    return { label: until ? `Socio activo hasta el ${formatDayMonth(until, data?.today)}` : 'Socio activo', tone: line.status === 'EXPIRING' ? 'warning' : 'success' };
  }
  if (line.status === 'PENDING') return { label: 'Socio · pago en curso', tone: 'info' };
  if (line.status === 'SUSPENDED') return { label: 'Socio · plan suspendido', tone: 'warning' };
  return { label: line.status === 'CANCELLED' ? 'Socio · plan cancelado' : 'Socio · plan vencido', tone: 'neutral' };
}

/** What Inicio shows: the running line ending first (a gym membership wins a tie). */
export function headlineSubscription(data: MySubscriptions | undefined): { line: SubscriptionLine; sellerName: string | null } | null {
  const lines = (data?.items ?? []).flatMap((group) =>
    group.subscriptions.filter((line) => line.current && (line.status === 'ACTIVE' || line.status === 'EXPIRING')).map((line) => ({ line, sellerName: group.seller?.name ?? null, gym: group.seller?.entityType === 'GYM' })),
  );
  const end = (line: SubscriptionLine) => line.current?.endsOn ?? '9999-12-31';
  const [first] = lines.sort((a, b) => end(a.line).localeCompare(end(b.line)) || Number(b.gym) - Number(a.gym));
  return first ? { line: first.line, sellerName: first.sellerName } : null;
}

/** A gym's MEMBERSHIP needs the buyer's SOCIO there (ADR-0026); passes, packs and services do not. */
export function isGymMembership(listing: { offerKind: string; seller: { entityType: string } }): boolean {
  return listing.offerKind === 'MEMBERSHIP' && listing.seller.entityType === 'GYM';
}

/**
 * Whether the checkout asks «Hazte socio» (sede + 3 CI digits): a gym
 * membership whose buyer is not already SOCIO (confirmed or requested) of
 * that gym. A person is SOCIO of one gym at most, so `/me/gym` says it all.
 */
export function needsSocioStep(listing: { offerKind: string; seller: { id: string; entityType: string } }, myGym: MyGym | null | undefined): boolean {
  if (!isGymMembership(listing) || !myGym) return false;
  const confirmedHere = myGym.status === 'CONFIRMED' && myGym.gym?.id === listing.seller.id;
  return !confirmedHere && myGym.pendingRequest?.gym.id !== listing.seller.id;
}

/** The `affiliation` of `POST /directory/payments/orders`. */
export function checkoutAffiliationOf(form: { locationId: string; ciLast3: string }, switchGym = false): { locationId: string; ciLast3: string; switchGym?: boolean } {
  return { locationId: form.locationId, ciLast3: form.ciLast3, ...(switchGym ? { switchGym: true } : {}) };
}

const PLAN_LIVE = new Set(['ACTIVE', 'EXPIRING', 'UPCOMING']);

/**
 * The plan chip of a SOCIO in the gym's «Socios» (plan §4.2): «Activo hasta …»,
 * «Plan vencido» or «Sin plan». `complete` says every subscriber page was read:
 * without it a missing plan is unknown, not «Sin plan».
 */
export function socioPlanChip(affiliationId: string, subscribers: readonly Subscriber[], complete: boolean, today?: string): { label: string; tone: SubscriptionTone } | null {
  const mine = subscribers.filter((row) => row.affiliation?.id === affiliationId && row.listing.offerKind === 'MEMBERSHIP');
  const live = mine.filter((row) => PLAN_LIVE.has(row.status)).sort((a, b) => (b.endsOn ?? '9999').localeCompare(a.endsOn ?? '9999'))[0];
  if (live) return { label: live.endsOn ? `Activo hasta el ${formatDayMonth(live.endsOn, today)}` : 'Plan activo', tone: live.status === 'EXPIRING' ? 'warning' : 'success' };
  const ended = mine[0];
  if (ended) return ended.status === 'SUSPENDED' ? { label: 'Plan suspendido', tone: 'warning' } : { label: ended.status === 'CANCELLED' ? 'Plan cancelado' : 'Plan vencido', tone: 'neutral' };
  return complete ? { label: 'Sin plan', tone: 'neutral' } : null;
}

/** A subscriber row's facts: plan, sede and when the plan ends. */
export function subscriberFacts(row: Subscriber, today?: string): string {
  const end = row.endsOn ? (row.status === 'EXPIRED' ? `Venció el ${formatDayMonth(row.endsOn, today)}` : `Hasta el ${formatDayMonth(row.endsOn, today)}`) : null;
  return [row.listing.name, row.affiliation?.location, end].filter(Boolean).join(' · ');
}
