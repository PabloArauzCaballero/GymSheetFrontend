import { Ionicons } from '@expo/vector-icons';
import { ScrollView, Text, View } from 'react-native';
import { type CatalogTab, type MineChip } from '@gymsheet/hooks';
import { SegmentLabel, SegmentedPill } from '@/components/motion';
import { FilterChip } from '@/components/filter-chip';
import { colors, fontSizes, gutter, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

/**
 * Orden y nombres del móvil: lo público primero, luego lo que REPP destaca y al
 * final lo privado. Cada pestaña lleva icono y UNA palabra: con tres opciones a
 * lo ancho, «Recomendadas» obligaba a encoger la letra y se leía apretado.
 * Los ámbitos son los de `CATALOG_TABS`.
 */
const TABS: readonly {
  scope: CatalogTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}[] = [
  { scope: 'public', label: 'Públicas', icon: 'globe-outline', iconActive: 'globe' },
  { scope: 'official', label: 'Destacadas', icon: 'sparkles-outline', iconActive: 'sparkles' },
  { scope: 'mine', label: 'Privadas', icon: 'lock-closed-outline', iconActive: 'lock-closed' },
];

/**
 * Pestañas como control segmentado accesible. La pastilla es neutra: elegir
 * una pestaña es seleccionar, no la acción principal (el acento no va aquí).
 */
export function CatalogTabBar({
  value,
  onChange,
}: {
  value: CatalogTab;
  onChange: (next: CatalogTab) => void;
}) {
  return (
    <View accessibilityRole="tablist">
      <SegmentedPill
        fill
        itemStyle={{
          minHeight: minTouchTarget,
          flexGrow: 1,
          flexBasis: 0,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.xs,
        }}
        onChange={onChange}
        options={TABS.map((tab) => ({
          value: tab.scope,
          accessibilityLabel: `Pestaña ${tab.label}`,
        }))}
        pillColor={colors.surfaceHighest}
        renderItem={(option, active) => {
          const tab = TABS.find((item) => item.scope === option.value);
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Ionicons
                color={active ? colors.volt : colors.textMuted}
                name={(active ? tab?.iconActive : tab?.icon) ?? 'ellipse-outline'}
                size={iconSizes.sm}
              />
              <SegmentLabel
                active={active}
                activeColor={colors.text}
                inactiveColor={colors.textMuted}
                label={tab?.label ?? ''}
                style={{ fontSize: fontSizes.sm, fontWeight: semibold }}
              />
            </View>
          );
        }}
        style={{
          alignSelf: 'stretch',
          borderRadius: radii.full,
          backgroundColor: colors.surfaceLow,
          padding: spacing.xs,
        }}
        value={value}
      />
    </View>
  );
}

/** Chips de «Mías»: Creadas por mí · Compartidas conmigo (n). */
export function MineChips({
  value,
  onChange,
  pendingInvitations,
}: {
  value: MineChip;
  onChange: (next: MineChip) => void;
  pendingInvitations: number;
}) {
  return (
    // Desplazable y a sangre, como los chips de objetivo: con el margen de 24
    // «Compartidas conmigo (n)» ya no cabe a lo ancho en un iPhone.
    <ScrollView
      contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: gutter }}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -gutter }}
    >
      <FilterChip
        label="Creadas por mí"
        onPress={() => onChange('created')}
        selected={value === 'created'}
        testID="chip-created"
      />
      <FilterChip
        accessibilityLabel={
          pendingInvitations > 0
            ? `Compartidas conmigo, ${pendingInvitations} invitaciones pendientes`
            : 'Compartidas conmigo'
        }
        label={pendingInvitations > 0 ? `Compartidas conmigo (${pendingInvitations})` : 'Compartidas conmigo'}
        onPress={() => onChange('shared')}
        selected={value === 'shared'}
        testID="chip-shared"
      />
    </ScrollView>
  );
}

/** «Mostrando 12 rutinas» con el filtro activo, para que el contador sea verificable. */
export function ResultCount({ shown, hasMore }: { shown: number; hasMore: boolean }) {
  return (
    <Text
      accessibilityLiveRegion="polite"
      style={{ color: colors.textMuted, fontSize: fontSizes.sm }}
      testID="result-count"
    >
      {shown === 1 ? '1 rutina' : `${shown} rutinas`}
      {hasMore ? ' · hay más' : ''}
    </Text>
  );
}
