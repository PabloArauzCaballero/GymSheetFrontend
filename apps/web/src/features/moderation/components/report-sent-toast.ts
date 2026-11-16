import { reportCopy } from '@gymsheet/domain';
import { notify } from '@/shared/notifications';

/** Long enough to reach «Retirar» without hurrying; «Tus denuncias» in Ajustes stays as the lasting way back. */
export const REPORT_UNDO_MS = 10_000;

/** «Denuncia enviada · Retirar»: the undo right after filing. */
export function notifyReportSent({
  contentHidden,
  consequence,
  onWithdraw,
}: Readonly<{ contentHidden: boolean; consequence: string; onWithdraw: () => void }>) {
  return notify.success({
    title: reportCopy.sent,
    message: contentHidden ? 'Retiramos el contenido mientras lo revisamos.' : consequence,
    duration: REPORT_UNDO_MS,
    action: { label: reportCopy.undo, onClick: onWithdraw },
  });
}
