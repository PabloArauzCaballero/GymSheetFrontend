import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ReppLogo } from '@/components/brand/repp-mark';
import { PressableScale } from '@/components/motion';
import { colors, fontSizes, iconSizes, radii, spacing } from '@/theme';

export type DeckCategory = 'foryou' | 'goal';

const CATEGORIES: { key: DeckCategory; label: string }[] = [
  { key: 'foryou', label: 'Para ti' },
  { key: 'goal', label: 'Mismo objetivo' },
];

const ROUND = {
  width: 42,
  height: 42,
  borderRadius: radii.full,
  backgroundColor: colors.surfaceHigh,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
} as const;

/** REPP brand, filter and overflow buttons, and the deck category switch. */
export function DeckHeader({
  filtersActive,
  category,
  onCategory,
  onOpenFilters,
  onOpenMenu,
}: {
  filtersActive: boolean;
  category: DeckCategory;
  onCategory: (category: DeckCategory) => void;
  onOpenFilters: () => void;
  onOpenMenu: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: Math.max(insets.top, spacing.sm), paddingHorizontal: spacing.md, paddingBottom: spacing.xs, gap: spacing.sm, zIndex: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <ReppLogo height={26} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <PressableScale
            accessibilityLabel="Preferencias de búsqueda"
            onPress={onOpenFilters}
            style={{ ...ROUND, borderColor: filtersActive ? colors.volt : colors.borderSubtle }}
          >
            <Ionicons color={filtersActive ? colors.volt : colors.text} name="options-outline" size={iconSizes.md} />
            {filtersActive && (
              <View style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.volt }} />
            )}
          </PressableScale>
          <PressableScale accessibilityLabel="Opciones de Comunidad" onPress={onOpenMenu} style={{ ...ROUND, borderColor: colors.borderSubtle }}>
            <Ionicons color={colors.text} name="ellipsis-horizontal" size={iconSizes.md} />
          </PressableScale>
        </View>
      </View>
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfaceLow,
            padding: 3,
            borderRadius: radii.full,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            gap: 2,
          }}
        >
          {CATEGORIES.map(({ key, label }) => {
            const active = category === key;
            return (
              <Pressable
                key={key}
                onPress={() => onCategory(key)}
                style={{ paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.full, backgroundColor: active ? colors.surfaceHigh : 'transparent' }}
              >
                <Text style={{ color: active ? colors.text : colors.textMuted, fontSize: fontSizes.xs, fontWeight: active ? '700' : '500' }}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
