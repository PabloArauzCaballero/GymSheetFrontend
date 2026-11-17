import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { businessTypeCards, businessWizardCopy, legalKindChoices, needsLegalKind } from '@gymsheet/domain';
import type { EntityType, LegalKind } from '@gymsheet/schemas';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

const TYPE_ICONS: Readonly<Record<EntityType, keyof typeof Ionicons.glyphMap>> = {
  GYM: 'barbell-outline',
  COACH: 'person-outline',
  CENTER: 'pulse-outline',
  STORE: 'storefront-outline',
  SERVICE_PROVIDER: 'construct-outline',
};

export type BusinessKind = { type: EntityType | null; legalKind: LegalKind | null };

/** One big radio card (selected in the text tone, never accent); also the kind cards of a listing. */
export function ChoiceCard({
  title,
  description,
  icon,
  selected,
  onPress,
}: {
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityLabel={`${title}. ${description}`}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      haptic="selection"
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: minTouchTarget + spacing.lg,
        padding: spacing.md,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        // Selected in the text tone, never in accent (repp-diseno §2).
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.text : colors.border,
        backgroundColor: selected ? colors.surface : colors.surfaceLow,
      }}
    >
      {icon ? <Ionicons accessibilityElementsHidden color={colors.text} importantForAccessibility="no-hide-descendants" name={icon} size={iconSizes.lg} /> : null}
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text strong variant="headline">{title}</Text>
        <Text tone="secondary" variant="subhead">{description}</Text>
      </View>
    </PressableScale>
  );
}

/** Step 0, «¿Qué eres?»: one big card per type; a service provider also says company or person. */
export function TypeCards({ value, onChange }: { value: BusinessKind; onChange: (value: BusinessKind) => void }) {
  return (
    <View accessibilityRole="radiogroup" style={{ gap: spacing.smd }}>
      {businessTypeCards.map((card) => (
        <ChoiceCard
          description={card.description}
          icon={TYPE_ICONS[card.type]}
          key={card.type}
          onPress={() => onChange({ type: card.type, legalKind: needsLegalKind(card.type) ? value.legalKind : null })}
          selected={value.type === card.type}
          title={card.title}
        />
      ))}
      {needsLegalKind(value.type) ? (
        <View accessibilityRole="radiogroup" style={{ gap: spacing.smd, marginTop: spacing.sm }}>
          <Text strong variant="subhead">{businessWizardCopy.legalKindLegend}</Text>
          {legalKindChoices.map((choice) => (
            <ChoiceCard
              description={choice.description}
              key={choice.value}
              onPress={() => onChange({ ...value, legalKind: choice.value })}
              selected={value.legalKind === choice.value}
              title={choice.title}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
