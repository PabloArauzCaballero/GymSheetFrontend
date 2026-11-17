import type { Ionicons } from '@expo/vector-icons';
import { offerKindCopy, offerKindsFor } from '@gymsheet/domain';
import type { EntityType, OfferKind } from '@gymsheet/schemas';
import { View } from 'react-native';
import { ChoiceCard } from '@/features/business/type-cards';
import { spacing } from '@/theme';

const KIND_ICONS: Readonly<Record<OfferKind, keyof typeof Ionicons.glyphMap>> = {
  MEMBERSHIP: 'repeat-outline',
  DAY_PASS: 'ticket-outline',
  MULTI_DAY_PASS: 'calendar-outline',
  CLASS_PACK: 'layers-outline',
  SERVICE_SESSION: 'person-outline',
  SERVICE_PACK: 'barbell-outline',
  PRODUCT: 'cube-outline',
};

/** Step 1, «¿Qué vas a publicar?»: one card per kind, the business type's usual kinds first. */
export function KindCards({ entityType, value, onChange }: { entityType: EntityType | null; value: OfferKind | null; onChange: (kind: OfferKind) => void }) {
  return (
    <View accessibilityRole="radiogroup" style={{ gap: spacing.smd }}>
      {offerKindsFor(entityType).map((kind) => (
        <ChoiceCard
          description={offerKindCopy[kind].description}
          icon={KIND_ICONS[kind]}
          key={kind}
          onPress={() => onChange(kind)}
          selected={value === kind}
          title={offerKindCopy[kind].label}
        />
      ))}
    </View>
  );
}
