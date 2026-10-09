import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { shareStatusLabels } from '@gymsheet/schemas';
import { routineSharingService } from '@/api/services';
import { Skeleton } from '@/components/feedback';
import { Badge } from '@/components/layout';
import { Button } from '@/components/ui';
import { notify } from '@/notifications';
import { colors, fontSizes, radii, semibold, spacing } from '@/theme';

/** «Compartida con»: el estado de cada invitación y «Revocar» (RF-13). */
export function SharesSection({ routineId, onShare }: { routineId: string; onShare: () => void }) {
  const queryClient = useQueryClient();
  const shares = useQuery({
    queryKey: ['routine-shares', routineId],
    queryFn: () => routineSharingService.listShares(routineId),
  });
  const revoke = useMutation({
    mutationFn: (shareId: string) => routineSharingService.revoke(routineId, shareId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['routine-shares', routineId] });
      notify.success('Acceso revocado.');
    },
    onError: (error: Error) => notify.error(error),
  });
  const live = (shares.data ?? []).filter((share) => share.estado !== 'REVOKED');

  return (
    <View style={{ gap: spacing.sm }} testID="shared-with">
      {shares.isPending ? <Skeleton height={56} /> : null}
      {!shares.isPending && live.length === 0 ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
          Todavía no la compartiste con nadie.
        </Text>
      ) : null}
      {live.map((share) => (
        <View
          accessibilityLabel={`${share.invitadoNombre ?? 'Persona'}, ${shareStatusLabels[share.estado] ?? share.estado}`}
          key={share.id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            borderRadius: radii.md,
            backgroundColor: colors.surfaceLow,
            padding: spacing.md,
          }}
        >
          <Text style={{ flex: 1, color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
            {share.invitadoNombre ?? 'Persona'}
          </Text>
          <Badge
            label={shareStatusLabels[share.estado] ?? share.estado}
            tone={share.estado === 'ACCEPTED' ? 'success' : share.estado === 'DECLINED' ? 'warning' : 'info'}
          />
          {share.estado === 'PENDING' || share.estado === 'ACCEPTED' ? (
            <Button
              label="Revocar"
              onPress={() => revoke.mutate(share.id)}
              style={{ paddingHorizontal: spacing.md }}
              variant="ghost"
            />
          ) : null}
        </View>
      ))}
      <Button label="Compartir con…" onPress={onShare} />
    </View>
  );
}
