import { Ionicons } from '@expo/vector-icons';
import {
  CARD_RARITY_HINT,
  CARD_RARITY_LABEL,
  CARD_TIERS,
  SECRET_BADGES_HINT,
  type CardRarity,
} from '@gymsheet/domain';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { accentPolicy, colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

const ORDER: readonly CardRarity[] = ['COMUN', 'RARA', 'EPICA', 'LEGENDARIA'];

/**
 * «¿Qué significa la rareza?», plegado por defecto.
 *
 * La etiqueta de rareza de cada insignia dice «Épica» sin decir qué es eso.
 * Explicarlo en cada tarjeta repetiría la misma frase veinte veces; plegado
 * sobre la lista cuesta un renglón a quien ya lo sabe y un toque a quien no.
 */
export function RarityLegend() {
  const [open, setOpen] = useState(false);

  return (
    <View style={{ gap: spacing.sm }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          alignSelf: 'flex-start',
          minHeight: minTouchTarget,
        }}
      >
        <Ionicons color={accentPolicy.ink} name="information-circle-outline" size={iconSizes.md} />
        <Text style={{ color: accentPolicy.ink, fontSize: fontSizes.sm, fontWeight: semibold }}>
          ¿Qué significa la rareza?
        </Text>
        <Ionicons
          color={accentPolicy.ink}
          name={open ? 'chevron-up' : 'chevron-down'}
          size={iconSizes.sm}
        />
      </Pressable>

      {open ? (
        <View
          style={{
            gap: spacing.sm,
            padding: spacing.md,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            backgroundColor: colors.surfaceLow,
          }}
        >
          {ORDER.map((rarity) => (
            <View key={rarity} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  marginTop: 5,
                  borderRadius: radii.full,
                  backgroundColor: CARD_TIERS[rarity].frame[1],
                }}
              />
              <Text style={{ flex: 1, color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
                <Text style={{ color: colors.text, fontWeight: semibold }}>
                  {CARD_RARITY_LABEL[rarity]}.
                </Text>{' '}
                {CARD_RARITY_HINT[rarity]}
              </Text>
            </View>
          ))}
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
            {SECRET_BADGES_HINT}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
