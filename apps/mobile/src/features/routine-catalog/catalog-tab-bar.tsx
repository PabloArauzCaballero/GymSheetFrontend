import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { type CatalogTab } from '@gymsheet/hooks';
import { SegmentLabel, SegmentedPill } from '@/components/motion';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

/**
 * «Todas» junta lo público con lo tuyo (lo privado se marca en la tarjeta con
 * «Solo tú la ves»); «Compartidas» reúne las del equipo REPP (con su sello) y
 * lo que te enviaron. REPP ya no es pestaña propia (Pablo, 2026-10-15). Cada
 * pestaña lleva icono y UNA palabra para que quepan a lo ancho.
 */
const TABS: readonly {
  scope: CatalogTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}[] = [
  { scope: 'all', label: 'Todas', icon: 'grid-outline', iconActive: 'grid' },
  { scope: 'shared', label: 'Compartidas', icon: 'people-outline', iconActive: 'people' },
];

/**
 * Pestañas como control segmentado accesible. La pastilla es neutra: elegir
 * una pestaña es seleccionar, no la acción principal (el acento no va aquí).
 */
export function CatalogTabBar({
  value,
  onChange,
  pendingInvitations = 0,
}: {
  value: CatalogTab;
  onChange: (next: CatalogTab) => void;
  pendingInvitations?: number;
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
          accessibilityLabel:
            tab.scope === 'shared' && pendingInvitations > 0
              ? `Pestaña ${tab.label}, ${pendingInvitations} invitaciones pendientes`
              : `Pestaña ${tab.label}`,
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
                label={`${tab?.label ?? ''}${tab?.scope === 'shared' && pendingInvitations > 0 ? ` (${pendingInvitations})` : ''}`}
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
