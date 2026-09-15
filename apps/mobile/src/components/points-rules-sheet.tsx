import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { pointRuleLines, pointsFigures, type PointRuleLine } from '@gymsheet/domain';
import type { PointRules, ProgressionBadge, ProgressionStats } from '@gymsheet/schemas';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { progressionService } from '@/api/services';
import { ErrorState, Skeleton } from '@/components/feedback';
import { Button } from '@/components/ui';
import {
  accentPolicy,
  colors,
  fontSizes,
  iconSizes,
  minTouchTarget,
  radii,
  semibold,
  spacing,
} from '@/theme';

/**
 * «Cómo se ganan los puntos», con tus propias cifras al lado de cada regla.
 *
 * Las tarifas llegan del servidor (`/me/progression/rules`) y nunca se copian
 * aquí: si el gimnasio las ajusta, esta hoja las explica ya ajustadas. Cada
 * línea enseña la cuenta entera —«24 entrenos × 50 = 1.200»— porque una regla
 * sin tu número al lado es teoría, y con él es la explicación de tu marcador.
 */

const ICON: Record<PointRuleLine['key'], keyof typeof Ionicons.glyphMap> = {
  session: 'checkmark-done-outline',
  sets: 'layers-outline',
  volume: 'barbell-outline',
  streak: 'flame-outline',
  badges: 'ribbon-outline',
};

function format(value: number): string {
  return value.toLocaleString('es-ES');
}

export function usePointRules() {
  return useQuery({
    queryKey: ['progression', 'rules'],
    queryFn: () => progressionService.rules(),
    // Las tarifas cambian, si cambian, una vez por temporada.
    staleTime: 60 * 60_000,
  });
}

export function PointsRulesSheet({
  visible,
  onClose,
  points,
  stats,
  badges,
}: {
  visible: boolean;
  onClose: () => void;
  points: number;
  stats: ProgressionStats;
  badges: readonly ProgressionBadge[];
}) {
  const insets = useSafeAreaInsets();
  const rules = usePointRules();

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityLabel="Cerrar"
          onPress={onClose}
          style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)' }}
        />
        <View
          accessibilityViewIsModal
          style={{
            maxHeight: '88%',
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            paddingBottom: insets.bottom + spacing.md,
          }}
        >
          <ScrollView
            contentContainerStyle={{ gap: spacing.lg, padding: spacing.lg }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text
                  accessibilityRole="header"
                  style={{
                    color: colors.text,
                    fontSize: fontSizes.xl,
                    fontWeight: semibold,
                    letterSpacing: fontSizes.xl * -0.03,
                  }}
                >
                  Cómo se ganan los puntos
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
                  Cada regla con tus números al lado.
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Cerrar"
                accessibilityRole="button"
                hitSlop={8}
                onPress={onClose}
                style={{
                  width: minTouchTarget,
                  height: minTouchTarget,
                  borderRadius: radii.full,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.surfaceHigh,
                }}
              >
                <Ionicons color={colors.text} name="close" size={iconSizes.md} />
              </Pressable>
            </View>

            {rules.isPending ? (
              <Skeleton height={260} />
            ) : rules.isError ? (
              <ErrorState error={rules.error} onRetry={() => void rules.refetch()} />
            ) : (
              <RuleList badges={badges} points={points} rules={rules.data} stats={stats} />
            )}

            <Button label="Entendido" onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function RuleList({
  rules,
  stats,
  badges,
  points,
}: {
  rules: PointRules;
  stats: ProgressionStats;
  badges: readonly ProgressionBadge[];
  points: number;
}) {
  const figures = pointsFigures(rules, stats, badges);
  const lines = pointRuleLines(rules);

  return (
    <View style={{ gap: spacing.md }}>
      <View
        style={{
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
          backgroundColor: colors.surfaceLow,
        }}
      >
        {lines.map((line, index) => {
          const figure = figures[line.key];
          return (
            <View
              accessible
              accessibilityLabel={`${line.label}: ${line.rate}. Tú: ${figure.detail}, ${format(figure.total)} puntos.`}
              key={line.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.md,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colors.borderSubtle,
              }}
            >
              <Ionicons color={accentPolicy.glyph} name={ICON[line.key]} size={iconSizes.md} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: semibold }}>
                  {line.label}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                  {`${line.rate} · Tú: ${figure.detail}`}
                </Text>
              </View>
              <Text
                style={{
                  color: colors.text,
                  fontSize: fontSizes.md,
                  fontWeight: semibold,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {format(figure.total)}
              </Text>
            </View>
          );
        })}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.md,
        }}
      >
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Tu total</Text>
        <Text
          style={{
            color: accentPolicy.ink,
            fontSize: fontSizes.xl,
            fontWeight: semibold,
            fontVariant: ['tabular-nums'],
          }}
        >
          {`${format(points)} puntos`}
        </Text>
      </View>

      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
        Los puntos nunca bajan. La racha cuenta la más larga que hayas hecho, así que descansar no te
        quita nada.
      </Text>
    </View>
  );
}
