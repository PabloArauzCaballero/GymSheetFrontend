import { businessChatCopy, businessChatFailure, type BusinessChatFailure } from '@gymsheet/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { businessChatService } from '@/features/business-chat/business-chat-service';
import { colors, radii, spacing } from '@/theme';

/**
 * «Escribir» on a business profile or listing (franja 8f). Only persons reach
 * these screens (a business account mounts its own shell): it opens, or gets
 * back, the chat with that business and goes to it. A refusal stays under the
 * button with what happened and what to do next.
 */
export function WriteToBusiness({ entityId, variant = 'primary' }: { entityId: string; variant?: 'primary' | 'ghost' }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<BusinessChatFailure | null>(null);
  const open = useMutation({
    mutationFn: () => businessChatService.open(entityId),
    onMutate: () => setFailure(null),
    onSuccess: async ({ conversationId }) => {
      await queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      router.push({ pathname: '/chat/[id]', params: { id: conversationId } });
    },
    onError: (error) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setFailure(businessChatFailure(error));
    },
  });
  return (
    <View style={{ gap: spacing.sm }}>
      <Button
        icon="chatbubble-outline"
        label={open.isPending ? businessChatCopy.writing : businessChatCopy.write}
        loading={open.isPending}
        onPress={() => open.mutate()}
        testID="write-to-business"
        variant={variant}
      />
      {failure ? (
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={{ gap: spacing.xxs, padding: spacing.md, borderRadius: radii.md, borderCurve: 'continuous', backgroundColor: colors.surfaceHigh }}
        >
          <Text strong variant="subhead">
            {failure.title}
          </Text>
          <Text tone="secondary" variant="footnote">
            {failure.message}
          </Text>
          {failure.next === 'verify-email' ? (
            <Button label="Verificar mi correo" onPress={() => router.push('/verificar-correo')} size="sm" variant="ghost" />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
