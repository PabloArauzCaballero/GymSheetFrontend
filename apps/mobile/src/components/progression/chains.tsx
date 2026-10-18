import { Ionicons } from '@expo/vector-icons';
import { CARD_RARITY_LABEL, chainLevelLabel, type BadgeChainGroup } from '@gymsheet/domain';
import type { ProgressionBadge } from '@gymsheet/schemas';
import { Text, View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { MiniRewardCard } from '@/components/cards/reward-card';
import { isVeiled, resolveIllustration } from '@/components/cards/resolve';
import { PressableScale } from '@/components/motion';
import { BadgeTile, ProgressTrack } from '@/components/progression';
import { alpha, cardMaterials, cardPadding, colors, fontSizes, iconSizes, radii, semibold, spacing } from '@/theme';

export type BadgeChain = BadgeChainGroup<ProgressionBadge>;

/** Lo que tarda en bajar la hoja (`animationType="slide"`) antes de abrir otro Modal. */
const SHEET_DISMISS_MS = 450;

/**
 * Una cadena de insignias del mismo criterio como una sola ficha: la carta de
 * la última conseguida, «Nivel 2 de 4» y la siguiente meta con su barra. Así
 * setenta y nueve fichas iguales se quedan en unas treinta y cinco que se leen.
 *
 * Una cadena de un solo paso es una insignia de siempre: se pinta con
 * `BadgeTile` y se comporta igual que antes.
 */
export function BadgeChainTile({
  chain,
  onOpenChain,
  onCelebrate,
}: {
  chain: BadgeChain;
  onOpenChain: (chain: BadgeChain) => void;
  onCelebrate: (badge: ProgressionBadge) => void;
}) {
  if (chain.steps.length === 1) {
    const badge = chain.steps[0]!;
    return <BadgeTile badge={badge} onPress={badge.earned ? () => onCelebrate(badge) : undefined} />;
  }

  const shown = chain.current;
  const material = cardMaterials[shown.rarity];
  const level = chainLevelLabel(chain);
  const next = chain.next;
  const nextVeiled = next ? isVeiled(next) : false;
  const isNew = chain.steps.some((step) => step.isNew);

  return (
    <PressableScale
      accessibilityHint="Abre los pasos de la cadena"
      accessibilityLabel={`${shown.name}. ${level ?? ''}.${next ? ` Siguiente: ${nextVeiled ? 'secreta' : next.name}.` : ' Completa.'}`}
      onPress={() => onOpenChain(chain)}
      style={{
        gap: spacing.sm,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: chain.earnedCount > 0 ? alpha(material.label, 0.3) : colors.borderSubtle,
        backgroundColor: colors.surfaceLow,
        padding: cardPadding - 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {/* Las cartas de la cadena, apiladas: se ve que hay más de una. */}
        <View style={{ width: 52, height: 62 }}>
          <View style={{ position: 'absolute', left: 8, top: 0, opacity: 0.55, transform: [{ rotate: '8deg' }] }}>
            <MiniRewardCard
              art={resolveIllustration(next ?? shown)}
              rarity={(next ?? shown).rarity}
              state={next ? (nextVeiled ? 'veiled' : 'pending') : 'earned'}
              width={40}
            />
          </View>
          <View style={{ position: 'absolute', left: 0, top: 4 }}>
            <MiniRewardCard
              art={resolveIllustration(shown)}
              rarity={shown.rarity}
              state={chain.earnedCount > 0 ? 'earned' : isVeiled(shown) ? 'veiled' : 'pending'}
              width={40}
            />
          </View>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            numberOfLines={2}
            style={{ color: chain.earnedCount > 0 ? colors.text : colors.textSecondary, fontSize: fontSizes.sm, fontWeight: semibold }}
          >
            {chain.earnedCount > 0 ? shown.name : isVeiled(shown) ? 'Insignia secreta' : shown.name}
          </Text>
          <Text style={{ color: chain.earnedCount > 0 ? material.label : colors.textMuted, fontSize: fontSizes.xs, fontWeight: semibold }}>
            {chain.complete ? `${level} · completa` : level}
          </Text>
        </View>
        {isNew ? (
          <View style={{ paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radii.full, backgroundColor: alpha(material.label, 0.18) }}>
            <Text style={{ color: material.label, fontSize: fontSizes.xs, fontWeight: semibold }}>NUEVA</Text>
          </View>
        ) : null}
        <Ionicons color={colors.textMuted} name="chevron-forward" size={iconSizes.md} />
      </View>

      {next ? (
        <View style={{ gap: spacing.xs }}>
          <Text numberOfLines={2} style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
            {nextVeiled ? 'Siguiente: se revela al conseguirla.' : `Siguiente: ${next.name} · ${next.description}`}
          </Text>
          {next.progress !== null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <ProgressTrack color={cardMaterials[next.rarity].label} height={4} ratio={next.progress} />
              </View>
              {next.progressLabel ? (
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, fontVariant: ['tabular-nums'] }}>{next.progressLabel}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
          {shown.flavorText ?? shown.description}
        </Text>
      )}
    </PressableScale>
  );
}

/** Los pasos de una cadena, en una hoja: los conseguidos se pueden volver a abrir como carta. */
export function ChainSheet({
  chain,
  onClose,
  onCelebrate,
}: {
  chain: BadgeChain | null;
  onClose: () => void;
  onCelebrate: (badge: ProgressionBadge) => void;
}) {
  const title = chain ? (chain.earnedCount > 0 ? chain.current.name : chain.steps[0]!.name) : '';
  const rarities = chain ? [...new Set(chain.steps.map((step) => CARD_RARITY_LABEL[step.rarity]))].join(' → ') : '';
  return (
    <BottomSheet
      onClose={onClose}
      subtitle={chain ? `${chainLevelLabel(chain) ?? ''} · ${rarities}` : undefined}
      title={title}
      visible={chain !== null}
    >
      {chain
        ? chain.steps.map((step) => (
            <BadgeTile
              badge={step}
              key={step.code}
              onPress={
                step.earned
                  ? () => {
                      // Dos Modal encadenados dejan a iOS con uno que no llega a
                      // presentarse: la carta espera a que la hoja termine de bajar.
                      onClose();
                      setTimeout(() => onCelebrate(step), SHEET_DISMISS_MS);
                    }
                  : undefined
              }
            />
          ))
        : null}
    </BottomSheet>
  );
}
