import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  MARKETPLACE_SORTS,
  MARKETPLACE_TOP_RATING,
  hasActiveFilters,
  type MarketplaceFilters,
  type MarketplaceSort,
} from '@gymsheet/domain';
import { BottomSheet } from '@/components/bottom-sheet';
import { FilterChip } from '@/components/filter-chip';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, spacing } from '@/theme';

/** Fila de filtros bajo las categorías: Ordenar (hoja), 4.5 o más, Verificados y Borrar. */
export function FilterBar({
  filters,
  onChange,
  onReset,
}: {
  filters: MarketplaceFilters;
  onChange: (patch: Partial<MarketplaceFilters>) => void;
  onReset: () => void;
}) {
  const [sortOpen, setSortOpen] = useState(false);
  const sortLabel = MARKETPLACE_SORTS.find((item) => item.id === filters.sort)?.label ?? 'Ordenar';
  return (
    <>
      <ScrollView
        contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg, alignItems: 'center' }}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <FilterChip
          icon="swap-vertical-outline"
          label={filters.sort === 'relevance' ? 'Ordenar' : sortLabel}
          onPress={() => setSortOpen(true)}
          selected={filters.sort !== 'relevance'}
        />
        <FilterChip
          icon="star-outline"
          label={`${MARKETPLACE_TOP_RATING.toString().replace('.', ',')} o más`}
          onPress={() => onChange({ topRated: !filters.topRated })}
          selected={filters.topRated}
        />
        <FilterChip
          icon="shield-checkmark-outline"
          label="Verificados"
          onPress={() => onChange({ verifiedOnly: !filters.verifiedOnly })}
          selected={filters.verifiedOnly}
        />
        {hasActiveFilters(filters) ? (
          <PressableScale accessibilityLabel="Borrar filtros" onPress={onReset} style={{ paddingHorizontal: spacing.xs }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, textDecorationLine: 'underline' }}>Borrar</Text>
          </PressableScale>
        ) : null}
      </ScrollView>

      <BottomSheet onClose={() => setSortOpen(false)} title="Ordenar por" visible={sortOpen}>
        <View style={{ gap: spacing.xs }}>
          {MARKETPLACE_SORTS.map((option) => {
            const selected = option.id === filters.sort;
            return (
              <PressableScale
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                key={option.id}
                onPress={() => {
                  onChange({ sort: option.id as MarketplaceSort });
                  setSortOpen(false);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, justifyContent: 'space-between' }}
              >
                <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: selected ? '700' : '500' }}>{option.label}</Text>
                {selected ? <Ionicons color={colors.text} name="checkmark" size={20} /> : null}
              </PressableScale>
            );
          })}
        </View>
      </BottomSheet>
    </>
  );
}
