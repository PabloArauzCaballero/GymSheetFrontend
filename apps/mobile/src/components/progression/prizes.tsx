import { Ionicons } from '@expo/vector-icons';
import { PRIZE_STATUS_LABEL, prizeDateLabel, sortPrizes } from '@gymsheet/domain';
import type { Prize } from '@gymsheet/schemas';
import { Text, View } from 'react-native';
import { Section } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { alpha, cardMaterials, cardPadding, colors, fontSizes, iconSizes, radii, semibold, spacing } from '@/theme';
import { PrizeCode } from './prize-code';

/**
 * «Mis premios»: los cupones reales del gimnasio, como tickets.
 *
 * El código va grande porque es lo que se enseña en recepción. Los disponibles
 * primero; los canjeados y caducados se quedan como recuerdo, apagados. Sin
 * premios la sección no existe: no se promete nada que el gimnasio no dé.
 */
export function PrizesSection({ prizes, onOpen }: { prizes: readonly Prize[]; onOpen: (prize: Prize) => void }) {
  if (prizes.length === 0) return null;
  const sorted = sortPrizes(prizes);
  const available = sorted.filter((prize) => prize.status === 'DISPONIBLE').length;
  return (
    <Section icon="gift-outline" title={available > 0 ? `Mis premios · ${available} por usar` : 'Mis premios'}>
      <View style={{ gap: spacing.sm }}>
        {sorted.map((prize) => (
          <PrizeTicket key={prize.id} onPress={() => onOpen(prize)} prize={prize} />
        ))}
      </View>
    </Section>
  );
}

/** Ticket: talón con el icono a la izquierda, perforación y el cuerpo con el código. */
export function PrizeTicket({ prize, onPress }: { prize: Prize; onPress?: () => void }) {
  const material = cardMaterials.LEGENDARIA;
  const live = prize.status === 'DISPONIBLE';
  const ink = live ? material.label : colors.textMuted;
  const body = (
    <>
      <View
        style={{
          width: 64,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: live ? alpha(material.shadow, 0.16) : colors.surfaceHigh,
        }}
      >
        <Ionicons color={ink} name={prize.icon as keyof typeof Ionicons.glyphMap} size={iconSizes.xl} />
      </View>
      {/* Perforación: el borde punteado es lo que hace leer «ticket». */}
      <View
        style={{
          width: 0,
          borderLeftWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: live ? alpha(material.label, 0.45) : colors.border,
        }}
      />
      <View style={{ flex: 1, gap: spacing.xs, padding: cardPadding - 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
          <Text
            numberOfLines={2}
            style={{ flex: 1, color: live ? colors.text : colors.textSecondary, fontSize: fontSizes.md, fontWeight: semibold }}
          >
            {prize.title}
          </Text>
          <View
            style={{
              paddingHorizontal: spacing.sm,
              paddingVertical: 2,
              borderRadius: radii.full,
              backgroundColor: live ? alpha(material.label, 0.16) : colors.surfaceHigh,
            }}
          >
            <Text style={{ color: ink, fontSize: fontSizes.xs, fontWeight: semibold }}>
              {prize.isNew ? 'Nuevo' : PRIZE_STATUS_LABEL[prize.status]}
            </Text>
          </View>
        </View>
        <PrizeCode code={prize.code} ink={material.label} muted={!live} size="md" />
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
          {[prizeDateLabel(prize), `Por ${prize.source.name}`].join(' · ')}
        </Text>
        {live && prize.instructions ? (
          <Text style={{ color: colors.textSecondary, fontSize: fontSizes.footnote, lineHeight: 18 }}>
            {prize.instructions}
          </Text>
        ) : null}
      </View>
    </>
  );
  const surface = {
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: live ? alpha(material.label, 0.3) : colors.borderSubtle,
    backgroundColor: colors.surfaceLow,
  } as const;
  if (!onPress || !live) return <View style={surface}>{body}</View>;
  return (
    <PressableScale accessibilityLabel={`${prize.title}. Toca para ver la carta del premio`} onPress={onPress} style={surface}>
      {body}
    </PressableScale>
  );
}
