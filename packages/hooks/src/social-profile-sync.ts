import { queryKeys } from './query-keys';

/**
 * Cache and conflict rules of the "Conocer" profile, shared by web and mobile.
 * Pure on purpose (ADR-008): the query client is taken structurally, so this
 * package never imports its own copy of react-query.
 */

/** The slice of a TanStack `QueryClient` these helpers use. */
export type QueryInvalidator = {
  invalidateQueries(filters: { queryKey: readonly unknown[] }): Promise<unknown>;
};

/**
 * Re-reads the «Para aparecer en Conocer» checklist. Every mutation that can
 * close one of its gaps calls it: photos (upload/delete), the social profile
 * switch, the discovery preferences and the Conocer answers.
 */
export function refreshDiscoveryReadiness(client: QueryInvalidator): Promise<unknown> {
  return client.invalidateQueries({ queryKey: queryKeys.discoveryReadiness });
}

export const socialProfileConflictMessage =
  'Tu perfil cambió en otro dispositivo. Mantuvimos tus respuestas: revísalas y guarda de nuevo.';

/**
 * What a failed Conocer save means for the editor holding the draft.
 *
 * A 409 on `expectedVersion` means someone saved the profile elsewhere since it
 * was loaded. The merge rule: the person's draft is never replaced by the server
 * copy; only the server copy is re-read (for its version), the person is told,
 * and saving again is an informed overwrite, so nothing typed here is lost.
 */
export type SocialProfileSaveFailure = { conflict: true; message: string } | { conflict: false };

export function socialProfileSaveFailure(error: unknown): SocialProfileSaveFailure {
  const status = (error as { status?: unknown } | null | undefined)?.status;
  return status === 409 ? { conflict: true, message: socialProfileConflictMessage } : { conflict: false };
}
