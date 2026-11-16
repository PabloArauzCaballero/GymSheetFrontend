import { ACCOUNT_EXPORT_FAILED, ACCOUNT_EXPORT_READY } from '@gymsheet/schemas';

/**
 * Where an in-app notice opens, from its `tipo` (backend `metadata.type`).
 * The export notices point to «Descargar mis datos» in Privacidad y datos:
 * READY to download the copy, FAILED to ask for it again.
 */
export type NoticeDestination = 'account-export';

export function noticeDestination(notice: { tipo?: string | null }): NoticeDestination | null {
  return notice.tipo === ACCOUNT_EXPORT_READY || notice.tipo === ACCOUNT_EXPORT_FAILED ? 'account-export' : null;
}

export const noticeActionCopy = {
  'account-export': { ready: 'Ir a descargar mi copia', failed: 'Pedir otra copia' },
} as const;

/** The button label of a notice that opens somewhere; null for a plain notice. */
export function noticeActionLabel(notice: { tipo?: string | null }): string | null {
  if (noticeDestination(notice) !== 'account-export') return null;
  return notice.tipo === ACCOUNT_EXPORT_READY ? noticeActionCopy['account-export'].ready : noticeActionCopy['account-export'].failed;
}
