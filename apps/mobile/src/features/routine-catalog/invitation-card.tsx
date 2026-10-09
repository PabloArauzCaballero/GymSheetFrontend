import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { cardSubtitle, invitationHeadline } from '@gymsheet/hooks';
import type { RoutineCard } from '@gymsheet/schemas';
import { routineSharingService } from '@/api/services';
import { Badge } from '@/components/layout';
import { Button } from '@/components/ui';
import { notify } from '@/notifications';
import { colors, fontSizes, radii, semibold, spacing } from '@/theme';

/**
 * Invitación pendiente (RF-13): «@ana te compartió "Empuje 4 días"» con
 * Aceptar y Rechazar. No enseña ejercicios hasta aceptar; el backend tampoco los
 * manda.
 */
export function InvitationCard({
  card,
  onAccepted,
}: {
  card: RoutineCard;
  onAccepted: (routineId: string) => void;
}) {
  const queryClient = useQueryClient();
  const shareId = card.invitacion?.id ?? '';
  const respond = useMutation({
    mutationFn: (accept: boolean) =>
      accept ? routineSharingService.accept(shareId) : routineSharingService.decline(shareId),
    onSuccess: async (_result, accept) => {
      await queryClient.invalidateQueries({ queryKey: ['routines'] });
      await queryClient.invalidateQueries({ queryKey: ['routine-invitations'] });
      if (accept) {
        notify.success('Rutina aceptada.');
        onAccepted(card.id);
      } else {
        notify.info('Invitación rechazada.');
      }
    },
    onError: (error: Error) => notify.error(error),
  });

  return (
    <View
      accessibilityLabel={`Invitación. ${invitationHeadline(card)}. ${cardSubtitle(card)}`}
      style={{
        gap: spacing.sm,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: `${colors.volt}66`,
        backgroundColor: colors.surfaceLow,
        padding: spacing.md,
      }}
      testID={`invitation-${card.id}`}
    >
      <Badge label="Invitación" tone="info" />
      <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
        {invitationHeadline(card)}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
        {cardSubtitle(card)} · Verás los ejercicios cuando aceptes.
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          disabled={respond.isPending}
          label="Rechazar"
          onPress={() => respond.mutate(false)}
          style={{ flex: 1 }}
          variant="ghost"
        />
        <Button
          label="Aceptar"
          loading={respond.isPending}
          onPress={() => respond.mutate(true)}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}
