import type { QueryClient } from '@tanstack/react-query';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ReceiptUpdate } from '@/features/chat/hooks/use-chat-socket';
import { chatService } from '@/features/chat/services/chat-service';
import type { Message } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { notify } from '@/shared/notifications';

export type LiveReceiptState = { conversationId: string; receipt: ReceiptUpdate } | null;

export type ReceiptHandlerContext = Readonly<{
  conversationId: string;
  queryClient: QueryClient;
  receiptBarriersRef: MutableRefObject<Map<string, number>>;
  receiptBarrierSequenceRef: MutableRefObject<number>;
  setConversationRevoked: Dispatch<SetStateAction<boolean>>;
  setLiveMessages: Dispatch<SetStateAction<Message[]>>;
  setOlderMessages: Dispatch<SetStateAction<Message[]>>;
  setRevealedMedia: Dispatch<SetStateAction<Record<string, string>>>;
  setLiveReceiptState: Dispatch<SetStateAction<LiveReceiptState>>;
}>;

/**
 * Aplica un recibo de entrega/lectura del socket al estado del hilo: cierre de
 * la conversación, cambios de consentimiento (con su barrera hasta releer el
 * resumen canónico) y cursores normales de entregado/leído.
 */
export function applyReceiptUpdate(
  receipt: ReceiptUpdate,
  otherUserId: string | undefined,
  context: ReceiptHandlerContext,
): void {
  const {
    conversationId,
    queryClient,
    receiptBarriersRef,
    receiptBarrierSequenceRef,
    setConversationRevoked,
    setLiveMessages,
    setOlderMessages,
    setRevealedMedia,
    setLiveReceiptState,
  } = context;
  if (receipt.conversationId !== conversationId) return;
  if (receipt.conversationRevoked) {
    setConversationRevoked(true);
    setLiveMessages([]);
    setOlderMessages([]);
    setRevealedMedia({});
    setLiveReceiptState((current) =>
      current?.conversationId === conversationId ? null : current,
    );
    queryClient.setQueryData(queryKeys.messages(conversationId), []);
    void queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    notify.success('La conversación se cerró y el historial dejó de estar disponible.');
    return;
  }
  if (receipt.settingsChanged) {
    // Reciprocity means either participant changing consent invalidates the
    // previously public read cursor, including when this account changed it.
    const barrier = ++receiptBarrierSequenceRef.current;
    receiptBarriersRef.current.set(conversationId, barrier);
    setLiveReceiptState({ conversationId, receipt });
    void queryClient.invalidateQueries({ queryKey: ['chat', 'read-receipts'] });
    void (async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.conversations });
      const freshConversations = await chatService.listConversations();
      if (receiptBarriersRef.current.get(conversationId) !== barrier) return;
      queryClient.setQueryData(queryKeys.conversations, freshConversations);
      queryClient.setQueryData(['chat', 'conversations'], freshConversations);
      receiptBarriersRef.current.delete(conversationId);
      setLiveReceiptState((current) => {
        if (current?.conversationId !== conversationId || !current.receipt.settingsChanged) {
          return current;
        }
        if (current.receipt.deliveredAt) {
          return {
            conversationId,
            receipt: {
          conversationId,
              userId: current.receipt.userId,
              deliveredAt: current.receipt.deliveredAt,
            },
          };
        }
        return null;
      });
    })().catch(() => undefined);
    return;
  }
  if (receipt.userId !== otherUserId) return;
  if (receiptBarriersRef.current.has(conversationId)) {
    if (receipt.deliveredAt) {
      // Delivery remains available, but must not replace the invalidation
      // marker that suppresses the stale public read cursor.
      setLiveReceiptState({
        conversationId,
        receipt: {
          conversationId,
          userId: receipt.userId,
          deliveredAt: receipt.deliveredAt,
          settingsChanged: true,
        },
      });
    }
    // The event has no server sequence/version, so hold public read updates
    // until the canonical conversation summary has been fetched again.
    return;
  }
  setLiveReceiptState({ conversationId, receipt });
}
