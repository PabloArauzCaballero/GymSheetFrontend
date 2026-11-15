import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { Card, Section } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { accentPolicy, colors, iconSizes, radii, spacing } from '@/theme';

export type AboutChip = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap };

function InfoChip({ chip }: { chip: AboutChip }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.smd,
        paddingVertical: spacing.xs + spacing.xxs,
        borderRadius: radii.full,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceHigh,
      }}
    >
      <Ionicons color={colors.textSecondary} name={chip.icon} size={iconSizes.sm} />
      <Text variant="subhead">{chip.label}</Text>
    </View>
  );
}

/**
 * «Sobre ti»: la bio y las fichas que también salen en tu carta (objetivo,
 * nivel, lo que te gusta entrenar). Se lee aquí y se edita en «Editar perfil»:
 * tocar la tarjeta lleva allí.
 */
export function AboutSection({ bio, chips, onEdit }: { bio: string | null; chips: readonly AboutChip[]; onEdit: () => void }) {
  return (
    <Section title="Sobre ti">
      <PressableScale accessibilityHint="Abre la edición de tu perfil" accessibilityLabel={bio ? `Tu bio: ${bio}` : 'Escribe tu bio'} onPress={onEdit} testID="profile-about">
        <Card>
          {bio ? (
            <Text variant="body">{bio}</Text>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons color={accentPolicy.glyph} name="add-circle-outline" size={iconSizes.md} />
              <Text style={{ color: accentPolicy.ink }} strong variant="subhead">
                Escribe unas líneas sobre ti
              </Text>
            </View>
          )}
          {chips.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {chips.map((chip) => (
                <InfoChip chip={chip} key={chip.key} />
              ))}
            </View>
          ) : null}
        </Card>
      </PressableScale>
    </Section>
  );
}
