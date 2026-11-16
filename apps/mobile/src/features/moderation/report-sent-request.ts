import { reportCopy } from '@gymsheet/domain';

/**
 * A toast with an action stays this long: enough to reach «Retirar» one-handed.
 * «Tus denuncias» in Ajustes stays as the lasting way back.
 */
export const REPORT_UNDO_MS = 10_000;

/** «Denuncia enviada · Retirar», as a notification request (pure, so it is testable without React Native). */
export function reportSentRequest(input: { contentHidden: boolean; consequence: string; onWithdraw: () => void }) {
  return {
    title: reportCopy.sent,
    message: input.contentHidden ? 'Retiramos el contenido mientras lo revisamos.' : input.consequence,
    duration: REPORT_UNDO_MS,
    action: { label: reportCopy.undo, onClick: input.onWithdraw },
  };
}
