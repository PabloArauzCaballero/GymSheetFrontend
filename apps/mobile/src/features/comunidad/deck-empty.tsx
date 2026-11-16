import { mascotXml } from '@gymsheet/design-tokens/repi';
import { ScrollView, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Button } from '@/components/ui';
import { DiscoveryPreferencesEditor } from '@/components/social-status-editor';
import { colors, fontSizes, spacing } from '@/theme';

/** Copy column width: two short lines under the title instead of one long one. */
const COPY_WIDTH = 320;

function Heading({ title, body, large = false }: { title: string; body: string; large?: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: spacing.sm }}>
      <Text
        accessibilityRole="header"
        style={{ color: colors.text, fontSize: large ? fontSizes.xl : fontSizes.lg, fontWeight: '700', textAlign: 'center', letterSpacing: -0.4 }}
      >
        {title}
      </Text>
      <Text
        style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20, textAlign: 'center', maxWidth: COPY_WIDTH }}
      >
        {body}
      </Text>
    </View>
  );
}

/**
 * No preferences yet: nobody is recommended until the member says who they are
 * looking for (never guessed), so the form is asked right here, not shown as a dead-end error.
 */
export function DeckSetup({ onSaved }: { onSaved: () => void }) {
  return (
    <ScrollView
      contentContainerStyle={{ gap: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl }}
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, width: '100%' }}
    >
      <View style={{ alignItems: 'center', gap: spacing.md }}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <SvgXml height={88} width={88} xml={mascotXml('flirty')} />
        </View>
        <Heading
          body="Elige con quién quieres entrenar o conocer gente. Solo verás personas que encajen."
          title="Cuéntanos a quién buscas"
        />
      </View>
      <DiscoveryPreferencesEditor embedded onSaved={onSaved} />
    </ScrollView>
  );
}

/** The deck ran out: Repi rests (it is not an error), and the last decision stays undoable. */
export function DeckEmpty({
  canUndo,
  onChangeFilters,
  onRedeal,
  onUndo,
  undoing,
}: {
  canUndo: boolean;
  onChangeFilters: () => void;
  onRedeal: () => void;
  onUndo: () => void;
  undoing: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xl,
        gap: spacing.xl,
      }}
    >
      <View style={{ alignItems: 'center', gap: spacing.mdl }}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <SvgXml height={120} width={120} xml={mascotXml('resting')} />
        </View>
        <Heading
          large
          body="Repi también se quedó sin perfiles. Vuelve mañana o cambia los filtros de objetivo y sede."
          title="Ya viste a todos por hoy"
        />
      </View>

      <View style={{ width: '100%', maxWidth: COPY_WIDTH, gap: spacing.smd }}>
        <Button icon="reload-outline" label="Explorar de nuevo" onPress={onRedeal} variant="primary" />
        <Button icon="options-outline" label="Cambiar filtros" onPress={onChangeFilters} variant="ghost" />
        {/* The last decision stays undoable once the deck runs out (as on the web empty state). */}
        {canUndo ? (
          <Button
            icon="arrow-undo-outline"
            label="Deshacer la última"
            loading={undoing}
            onPress={onUndo}
            testID="comunidad-empty-undo"
            variant="ghost"
          />
        ) : null}
      </View>
    </View>
  );
}
