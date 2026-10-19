import type { ReceiptUpdate } from '@/features/chat/hooks/use-chat-socket';

/**
 * Cursores de entregado/leído de la otra persona. Un recibo en vivo manda sobre
 * el resumen REST, salvo que cambiara el consentimiento: entonces el cursor de
 * lectura público queda anulado hasta releer el resumen canónico.
 */
export function receiptCursors(
  summary: {
    deliveredAt: string | null | undefined;
    readAt: string | null | undefined;
    readSinceAt: string | null | undefined;
  },
  liveReceipt: ReceiptUpdate | null,
) {
  return {
    otherLastDeliveredAt:
      liveReceipt?.deliveredAt ??
      liveReceipt?.readAt ??
      summary.deliveredAt ??
      null,
    otherLastReadAt: liveReceipt?.settingsChanged
      ? null
      : liveReceipt?.readAt ?? summary.readAt ?? null,
    otherReadReceiptsSinceAt: liveReceipt?.settingsChanged
      ? null
      : liveReceipt?.readAt
        ? liveReceipt.readFrom ?? null
        : summary.readSinceAt ?? null,
  };
}
