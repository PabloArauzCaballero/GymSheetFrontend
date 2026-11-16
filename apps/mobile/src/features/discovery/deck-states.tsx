import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { mascotXml } from '@gymsheet/design-tokens/repi';
import { Button } from '@/components/ui';
import { DiscoveryPreferencesEditor } from '@/components/social-status-editor';
import { colors, fontSizes, spacing } from '@/theme';

export function DeckLoading() {
  return (
    <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.volt} size="large" />
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, marginTop: spacing.md }}>
        Cargando compañeros de entreno…
      </Text>
    </View>
  );
}

/**
 * Without saved preferences nobody is recommended (the app never guesses whom
 * someone wants to meet): ask for them right here instead of a dead-end error.
 */
export function DeckPreferencesRequired({ onSaved }: { onSaved: () => void }) {
  return (
    <ScrollView contentContainerStyle={{ gap: spacing.md, padding: spacing.lg }} style={{ flex: 1, width: '100%' }}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ alignItems: 'center' }}>
        <SvgXml height={96} width={96} xml={mascotXml('flirty')} />
      </View>
      <Text style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: '700', textAlign: 'center' }}>
        Cuéntanos a quién buscas
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'center' }}>
        Elige con quién quieres entrenar o conocer gente. Solo verás personas que encajen.
      </Text>
      <DiscoveryPreferencesEditor embedded onSaved={onSaved} />
    </ScrollView>
  );
}

/** The deck ran out: Repi rests, it is not an error. */
export function DeckEmpty({ onRedeal, onOpenFilters }: { onRedeal: () => void; onOpenFilters: () => void }) {
  return (
    <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <SvgXml height={128} width={128} xml={mascotXml('resting')} />
      </View>
      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: '700', textAlign: 'center' }}>
          Ya viste a todos por hoy
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'center', lineHeight: 20, maxWidth: 280 }}>
          Repi también se quedó sin perfiles. Vuelve mañana o abre los filtros de objetivo y sede.
        </Text>
      </View>
      <View style={{ width: '100%', maxWidth: 280, gap: spacing.sm }}>
        <Button icon="reload-outline" label="Explorar de nuevo" onPress={onRedeal} variant="primary" />
        <Button icon="options-outline" label="Cambiar filtros" onPress={onOpenFilters} variant="ghost" />
      </View>
    </View>
  );
}
