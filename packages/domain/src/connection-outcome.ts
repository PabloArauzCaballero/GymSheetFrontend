import type { Connection } from '@gymsheet/schemas';

/**
 * Single match model: connecting from the directory, the map or a profile is
 * a LIKE. If the other person had already liked you, the response comes back
 * ACCEPTED and the backend has opened the conversation in the same step.
 */
export function isMatchOutcome(connection: Pick<Connection, 'status'>): boolean {
  return connection.status === 'ACCEPTED';
}

export function connectionOutcomeMessage(connection: Pick<Connection, 'status'>): string {
  return isMatchOutcome(connection) ? 'Hicieron match. Ya pueden escribirse.' : 'Solicitud enviada.';
}
