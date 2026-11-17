import { businessChatCopy, businessChatFailure } from '@gymsheet/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { confirm, notify } from '@/notifications';
import { businessChatService } from './business-chat-service';

/**
 * «Bloquear a esta persona» from a business thread (ADR-0023): asks first,
 * because it closes the chat for both and there is no unblock yet; then the
 * business goes back to «Mensajes», where the chat no longer shows.
 */
export function useBlockPerson(conversationId: string): (personName: string) => void {
  const router = useRouter();
  const queryClient = useQueryClient();
  const block = useMutation({
    mutationFn: () => businessChatService.block(conversationId),
    onSuccess: async () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      await queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      notify.success(businessChatCopy.blocked);
      router.replace('/(business)/(tabs)/mensajes');
    },
    onError: (error) => notify.error(businessChatFailure(error).message),
  });
  return (personName) => {
    void confirm({
      title: businessChatCopy.blockTitle,
      message: `Vas a bloquear a ${personName}.`,
      description: businessChatCopy.blockConsequence,
      severity: 'danger',
      confirmLabel: businessChatCopy.blockConfirm,
      cancelLabel: 'Cancelar',
    }).then((result) => {
      if (result.confirmed) block.mutate();
    });
  };
}
