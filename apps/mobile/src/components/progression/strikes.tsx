import { Ionicons } from '@expo/vector-icons';
import type { ProgressionStreakStrikes } from '@gymsheet/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Text, View } from 'react-native';
import { progressionService } from '@/api/services';
import { Card } from '@/components/layout';
import { Button } from '@/components/ui';
import { notify } from '@/notifications';
import { cardMaterials, colors, fontSizes, iconSizes, radii, semibold, spacing } from '@/theme';

/**
 * Los strikes del mes: cuántos quedan para proteger la racha, las faltas de
 * esta semana que todavía se pueden reponer y el canje de puntos por strikes.
 *
 * Las reglas (servidor, `streak-strikes.ts`): una falta a tu plan se repone
 * entrenando un día de descanso de la misma semana; si no, gasta un strike;
 * sin strikes, cuesta puntos y no protege la racha. Canjear pide confirmación:
 * gasta puntos de verdad, aunque nunca baja de arena.
 */
export function StrikesCard({ strikes, points }: { strikes: ProgressionStreakStrikes; points: number }) {
  const queryClient = useQueryClient();
  const shield = cardMaterials.RARA.label;
  const canAfford = points >= strikes.strikeCostPoints;

  const buy = useMutation({
    mutationFn: () => progressionService.buyStrike(),
    onSuccess: (progression) => {
      queryClient.setQueryData(['progression', 'me'], progression);
      notify.success({ title: 'Strike canjeado', message: 'Tu racha tiene una protección más este mes.' });
    },
    onError: (error) => {
      notify.error({
        title: 'No se pudo canjear',
        message: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      });
    },
  });

  const confirmBuy = () =>
    Alert.alert(
      '¿Canjear un strike?',
      `Gastas ${strikes.strikeCostPoints} puntos de tu saldo. Tu arena no baja.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: `Canjear ${strikes.strikeCostPoints} pts`, onPress: () => buy.mutate() },
      ],
    );

  const pending = strikes.pendingThisWeek ?? 0;
  const lost = strikes.penaltyPointsTotal ?? 0;

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: radii.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceHighest,
          }}
        >
          <Ionicons color={shield} name="shield-checkmark" size={iconSizes.lg} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: semibold, fontVariant: ['tabular-nums'] }}>
            {`${strikes.available} ${strikes.available === 1 ? 'strike' : 'strikes'} este mes`}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
            {`Usados: ${strikes.usedThisMonth} · Canjeados: ${strikes.purchasedThisMonth}`}
          </Text>
        </View>
      </View>

      {pending > 0 ? (
        <Text style={{ color: colors.warning, fontSize: fontSizes.sm, marginTop: spacing.smd }}>
          {pending === 1
            ? 'Te falta 1 día de tu plan esta semana: repónlo entrenando un día de descanso antes del domingo.'
            : `Te faltan ${pending} días de tu plan esta semana: repónlos entrenando días de descanso antes del domingo.`}
        </Text>
      ) : null}
      {lost > 0 ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: spacing.xs }}>
          {`Puntos perdidos por faltas sin strike: ${lost}`}
        </Text>
      ) : null}

      <View style={{ marginTop: spacing.md }}>
        <Button
          accessibilityHint={`Gasta ${strikes.strikeCostPoints} puntos de tu saldo`}
          disabled={!canAfford || buy.isPending}
          icon="swap-horizontal-outline"
          label={
            canAfford
              ? `Canjear ${strikes.strikeCostPoints} pts por un strike`
              : `Necesitas ${strikes.strikeCostPoints} pts para canjear`
          }
          loading={buy.isPending}
          onPress={confirmBuy}
          variant="secondary"
        />
      </View>
    </Card>
  );
}
