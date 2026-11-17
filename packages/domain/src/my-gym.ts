import type { MyGym } from '@gymsheet/schemas';

/**
 * «Mi gimnasio» (franja 7c, backend ADR-0027): the gym of a person is their
 * confirmed SOCIO affiliation, never the session's tenant. Gym-scoped reads
 * (ranking, members) answer `403 GYM_MEMBERSHIP_REQUIRED` without one: a
 * state of the screen, not an error.
 */

export type GymGateStatus = 'NONE' | 'REQUESTED';

type ErrorLike = { code?: string | null; details?: Readonly<Record<string, unknown>> | null } | null | undefined;

/** The status behind a `403 GYM_MEMBERSHIP_REQUIRED`, or null for any other error. */
export function gymMembershipGate(error: ErrorLike): GymGateStatus | null {
  if (error?.code !== 'GYM_MEMBERSHIP_REQUIRED') return null;
  return error.details?.status === 'REQUESTED' ? 'REQUESTED' : 'NONE';
}

/** What a ranking or a member list shows instead of the data, with its next step. */
export function gymGateCopy(status: GymGateStatus): { title: string; message: string; action: string } {
  return status === 'REQUESTED'
    ? { title: 'Tu solicitud está enviada', message: 'Verás la clasificación y a los socios cuando el gimnasio te confirme.', action: 'Ver mi gimnasio' }
    : { title: 'Únete a tu gimnasio', message: 'Hazte socio de tu gimnasio para ver su clasificación y a sus socios.', action: 'Buscar mi gimnasio' };
}

export type MyGymCard =
  | { state: 'NONE'; title: string; message: string; action: string }
  | { state: 'REQUESTED'; title: string; message: string; gymName: string; handle: string | null; affiliationId: string }
  | {
      state: 'CONFIRMED';
      title: string;
      gymName: string;
      handle: string | null;
      logoUrl: string | null;
      detail: string;
      /** A gym switch waiting for the new gym. */
      switching: { gymName: string; affiliationId: string } | null;
    };

function sinceText(since: string | null): string | null {
  if (!since) return null;
  const date = new Date(since);
  return Number.isNaN(date.getTime()) ? null : `desde ${date.toLocaleDateString('es-BO', { month: 'long', year: 'numeric' })}`;
}

/** `GET /me/gym` → the card of the profile and the header of «Mi gimnasio». */
export function myGymCardOf(gym: MyGym): MyGymCard {
  if (gym.status === 'CONFIRMED' && gym.gym) {
    const switching = gym.pendingRequest?.switchesGym ? { gymName: gym.pendingRequest.gym.name, affiliationId: gym.pendingRequest.affiliationId } : null;
    return {
      state: 'CONFIRMED',
      title: `Socio de ${gym.gym.name}`,
      gymName: gym.gym.name,
      handle: gym.gym.handle,
      logoUrl: gym.gym.logoUrl,
      detail: [gym.location?.name, sinceText(gym.since)].filter(Boolean).join(' · '),
      switching,
    };
  }
  if (gym.pendingRequest) {
    const name = gym.pendingRequest.gym.name;
    return {
      state: 'REQUESTED',
      title: `Solicitud enviada a ${name}`,
      message: `${name} compara tus datos y te confirma.${gym.pendingRequest.location ? ` Sede: ${gym.pendingRequest.location.name}.` : ''}`,
      gymName: name,
      handle: gym.pendingRequest.gym.handle,
      affiliationId: gym.pendingRequest.affiliationId,
    };
  }
  return {
    state: 'NONE',
    title: 'Todavía no eres socio de un gimnasio',
    message: 'Busca tu gimnasio en el marketplace y pide ser socio. Con la confirmación ves su clasificación y a sus socios.',
    action: 'Buscar mi gimnasio',
  };
}

/** The visibility switch, in the person's words. */
export function membershipVisibilityLabel(gymName: string): string {
  return `Mostrar que soy socio de ${gymName}`;
}

export const membershipVisibilityHint =
  'Con esto apagado nadie ve tu sello, no sales en la lista de socios ni en la clasificación y Conocer no usa tu gimnasio.';

/** Where a person without a gym looks for one: the marketplace on its «Gimnasios» category. */
export const findGymWebHref = '/marketplace?categoria=gyms';
