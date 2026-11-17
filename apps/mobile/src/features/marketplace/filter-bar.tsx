import { Ionicons } from '@expo/vector-icons';
import {
  LISTING_SORTS,
  MARKETPLACE_TOP_RATING,
  OFFER_KIND_ORDER,
  hasActiveMarketplaceQuery,
  offerKindCopy,
  type MarketplaceQuery,
} from '@gymsheet/domain';
import type { OfferKind } from '@gymsheet/schemas';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { FilterChip } from '@/components/filter-chip';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { Button, Input } from '@/components/ui';
import { colors, comfortableTouchTarget, iconSizes, spacing } from '@/theme';
import type { MarketplaceTab } from './tabs';

type Sheet = 'kind' | 'place' | 'sort' | null;

function Option({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      haptic="selection"
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: comfortableTouchTarget }}
    >
      <Text strong={selected} variant="body">
        {label}
      </Text>
      {selected ? <Ionicons color={colors.text} name="checkmark" size={iconSizes.md} /> : null}
    </PressableScale>
  );
}

/**
 * Filters of the marketplace (plan §4.3). «Ofertas»: tipo, ciudad y precio
 * (one sheet, three fields), verificados and order. «Tiendas» keeps its
 * rating chip. Each choice opens a bottom sheet: the platform way to choose.
 */
export function FilterBar({
  tab,
  query,
  onChange,
  onReset,
}: {
  tab: MarketplaceTab;
  query: MarketplaceQuery;
  onChange: (patch: Partial<MarketplaceQuery>) => void;
  onReset: () => void;
}) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [place, setPlace] = useState({ city: query.city, priceMin: query.priceMin, priceMax: query.priceMax });
  const sortLabel = LISTING_SORTS.find((item) => item.id === query.sort)?.label ?? 'Ordenar';
  const placeActive = Boolean(query.city.trim() || query.priceMin.trim() || query.priceMax.trim());
  const choose = (patch: Partial<MarketplaceQuery>) => {
    onChange(patch);
    setSheet(null);
  };
  return (
    <>
      <ScrollView contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg, alignItems: 'center' }} horizontal showsHorizontalScrollIndicator={false}>
        {tab === 'OFFERS' ? (
          <>
            <FilterChip icon="pricetags-outline" label={query.offerKind ? offerKindCopy[query.offerKind].label : 'Tipo'} onPress={() => setSheet('kind')} selected={query.offerKind !== null} />
            <FilterChip
              icon="location-outline"
              label={placeActive ? query.city.trim() || 'Precio' : 'Ciudad y precio'}
              onPress={() => {
                setPlace({ city: query.city, priceMin: query.priceMin, priceMax: query.priceMax });
                setSheet('place');
              }}
              selected={placeActive}
            />
            <FilterChip icon="swap-vertical-outline" label={query.sort === 'recent' ? 'Ordenar' : sortLabel} onPress={() => setSheet('sort')} selected={query.sort !== 'recent'} />
          </>
        ) : (
          <FilterChip
            icon="star-outline"
            label={`${MARKETPLACE_TOP_RATING.toString().replace('.', ',')} o más`}
            onPress={() => onChange({ topRated: !query.topRated })}
            selected={query.topRated}
          />
        )}
        <FilterChip icon="shield-checkmark-outline" label="Verificados" onPress={() => onChange({ verifiedOnly: !query.verifiedOnly })} selected={query.verifiedOnly} />
        {hasActiveMarketplaceQuery(query) ? (
          <PressableScale accessibilityLabel="Borrar filtros" onPress={onReset} style={{ minHeight: comfortableTouchTarget, justifyContent: 'center', paddingHorizontal: spacing.xs }}>
            <Text style={{ textDecorationLine: 'underline' }} tone="muted" variant="subhead">
              Borrar
            </Text>
          </PressableScale>
        ) : null}
      </ScrollView>

      <BottomSheet onClose={() => setSheet(null)} title="Tipo de publicación" visible={sheet === 'kind'}>
        <View accessibilityRole="radiogroup">
          <Option label="Todos los tipos" onPress={() => choose({ offerKind: null })} selected={query.offerKind === null} />
          {OFFER_KIND_ORDER.map((kind: OfferKind) => (
            <Option key={kind} label={offerKindCopy[kind].label} onPress={() => choose({ offerKind: kind })} selected={query.offerKind === kind} />
          ))}
        </View>
      </BottomSheet>

      <BottomSheet onClose={() => setSheet(null)} title="Ciudad y precio" visible={sheet === 'place'}>
        <Input autoComplete="postal-address-locality" label="Ciudad" maxLength={100} onChangeText={(city) => setPlace((current) => ({ ...current, city }))} value={place.city} />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Input keyboardType="decimal-pad" label="Desde (Bs)" onChangeText={(priceMin) => setPlace((current) => ({ ...current, priceMin }))} value={place.priceMin} />
          </View>
          <View style={{ flex: 1 }}>
            <Input keyboardType="decimal-pad" label="Hasta (Bs)" onChangeText={(priceMax) => setPlace((current) => ({ ...current, priceMax }))} value={place.priceMax} />
          </View>
        </View>
        <Button label="Aplicar" onPress={() => choose(place)} />
      </BottomSheet>

      <BottomSheet onClose={() => setSheet(null)} title="Ordenar por" visible={sheet === 'sort'}>
        <View accessibilityRole="radiogroup">
          {LISTING_SORTS.map((option) => (
            <Option key={option.id} label={option.label} onPress={() => choose({ sort: option.id })} selected={query.sort === option.id} />
          ))}
        </View>
      </BottomSheet>
    </>
  );
}
