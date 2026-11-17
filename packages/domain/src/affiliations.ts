import type { Affiliation, AffiliationKind, AffiliationStatus, GymAffiliation, PersonAffiliationInput } from '@gymsheet/schemas';

/**
 * Affiliations to a gym (franja 7b, backend ADR-0025) as the person, the coach
 * business and the gym read them. Voice: de tú, short, verb first.
 */

export type AffiliationTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

/** Only digits, at most three: what a numeric keyboard leaves in the field. */
export function ciDigitsOf(input: string): string {
  return input.replace(/\D/gu, '').slice(0, 3);
}

export function ciDigitsError(value: string): string | null {
  return /^[0-9]{3}$/u.test(value) ? null : 'Escribe los últimos 3 dígitos de tu CI.';
}

/** «Hacerme socio» in one step: kind, sede and the 3 CI digits (three fields, under the four-field cap). */
export type JoinGymForm = { kind: AffiliationKind; locationId: string; ciLast3: string };
export type JoinGymField = keyof JoinGymForm;

export function joinGymFormOf(locations: readonly { id: string }[], kind: AffiliationKind = 'SOCIO'): JoinGymForm {
  // A gym with a single sede preselects it: one decision less.
  return { kind, locationId: locations.length === 1 ? (locations[0]?.id ?? '') : '', ciLast3: '' };
}

export function joinGymErrors(form: JoinGymForm, locations: readonly { id: string }[]): Partial<Record<JoinGymField, string>> {
  const errors: Partial<Record<JoinGymField, string>> = {};
  const known = locations.some((location) => location.id === form.locationId);
  if (form.kind === 'SOCIO' && !known) errors.locationId = locations.length === 0 ? 'Este gimnasio todavía no publicó sus sedes.' : 'Elige la sede donde entrenas.';
  if (form.kind === 'ENTRENADOR' && form.locationId && !known) errors.locationId = 'Elige una sede de la lista.';
  const ci = ciDigitsError(form.ciLast3);
  if (ci) errors.ciLast3 = ci;
  return errors;
}

/** The strict body of `POST /me/affiliations`; the sede is optional for a coach. */
export function joinGymPayload(form: JoinGymForm, gym: { handle?: string | null; entityId: string }, switchGym = false): PersonAffiliationInput {
  return {
    ...(gym.handle ? { gymHandle: gym.handle } : { gymEntityId: gym.entityId }),
    kind: form.kind,
    ...(form.locationId ? { locationId: form.locationId } : {}),
    ciLast3: form.ciLast3,
    ...(switchGym ? { switchGym: true } : {}),
  };
}

type ErrorLike = { code?: string | null; details?: Readonly<Record<string, unknown>> | null } | null | undefined;

/** `409 SOCIO_OF_ANOTHER_GYM`: ask «¿Quieres cambiarte?» and resend with `switchGym: true`. */
export function isSwitchGymConflict(error: ErrorLike): boolean {
  return error?.code === 'SOCIO_OF_ANOTHER_GYM' && error.details?.action === 'SWITCH_GYM';
}

export const LIVE_AFFILIATION_STATUSES: readonly AffiliationStatus[] = ['REQUESTED', 'CONFIRMED'];

export function isLiveAffiliation(affiliation: { status: AffiliationStatus }): boolean {
  return LIVE_AFFILIATION_STATUSES.includes(affiliation.status);
}

/** The live affiliations the person has with one gym (at most one per kind). */
export function liveAffiliationsWith(items: readonly Affiliation[], gymEntityId: string): Affiliation[] {
  return items.filter((item) => item.gym.id === gymEntityId && isLiveAffiliation(item));
}

/** What the person or the coach can do with their own row: cancel a request, leave a confirmed one. */
export function ownAffiliationAction(affiliation: { status: AffiliationStatus }): 'cancel' | 'end' | null {
  if (affiliation.status === 'REQUESTED') return 'cancel';
  if (affiliation.status === 'CONFIRMED') return 'end';
  return null;
}

export const affiliationKindLabels: Readonly<Record<AffiliationKind, string>> = { SOCIO: 'Socio', ENTRENADOR: 'Entrenador' };

/** The chip of an own affiliation. */
export function affiliationChip(affiliation: { kind: AffiliationKind; status: AffiliationStatus; reasonCode?: string | null }): { label: string; tone: AffiliationTone } {
  switch (affiliation.status) {
    case 'REQUESTED':
      return { label: 'Solicitud enviada', tone: 'info' };
    case 'CONFIRMED':
      return { label: affiliation.kind === 'SOCIO' ? 'Socio' : 'Entrenador', tone: 'success' };
    case 'REJECTED':
      return { label: 'Rechazada', tone: 'danger' };
    case 'ENDED':
      return { label: affiliation.reasonCode === 'SWITCHED_GYM' ? 'Te cambiaste de gimnasio' : 'Terminada', tone: 'neutral' };
    case 'CANCELLED':
      return { label: 'Cancelada', tone: 'neutral' };
  }
}

/** «CI termina en 123» on the gym's request card; nothing when the digits are gone. */
export function ciEndingText(subject: GymAffiliation['subject']): string | null {
  return subject?.type === 'PERSON' && subject.ciLast3 ? `CI termina en ${subject.ciLast3}` : null;
}

/** The name the gym reads on a row, whoever asked. */
export function gymAffiliationName(row: Pick<GymAffiliation, 'subject'>): string {
  if (!row.subject) return 'Afiliación cerrada';
  return row.subject.type === 'PERSON' ? row.subject.displayName : row.subject.name;
}

/** `Socio de Top Fitness` for the badge on a card or a profile. */
export function gymBadgeLabel(badge: { name: string } | null | undefined): string | null {
  return badge ? `Socio de ${badge.name}` : null;
}

/** `@TopFitness` → `TopFitness`: the leading @ goes, the backend normalizes the rest. */
export function gymHandleOf(input: string): string {
  return input.trim().replace(/^@+/u, '');
}
