import { authCopy } from '@gymsheet/domain';
import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { Checkbox } from '@/components/checkbox';
import { textLinkStyle } from '@/components/ui';
import { colors, fontSizes, spacing } from '@/theme';

/**
 * One checkbox for the three legal documents (terms, privacy with its
 * retention annex, community rules). A React Native checkbox takes a plain
 * label, so the documents open from three links under it.
 */
export function TermsField({
  checked,
  error,
  onChange,
}: {
  checked: boolean;
  error?: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Checkbox checked={checked} label={authCopy.terms.plain} onChange={onChange} />
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{authCopy.terms.separateConsentsNote}</Text>
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={{ color: colors.danger, fontSize: fontSizes.xs }}
        >
          {error}
        </Text>
      ) : null}
      {/* Short link labels: the checkbox above names the documents in full, and
          «Leer términos» wrapped on an iPhone SE. Screen readers hear the long form. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg, rowGap: spacing.xs }}>
        <Link accessibilityLabel={authCopy.terms.readTerms} href="/(auth)/terminos" numberOfLines={1} style={[textLinkStyle(), { flexShrink: 0 }]}>
          Términos
        </Link>
        <Link accessibilityLabel={authCopy.terms.readPrivacy} href="/(auth)/privacidad" numberOfLines={1} style={[textLinkStyle(), { flexShrink: 0 }]}>
          Privacidad
        </Link>
        <Link accessibilityLabel={authCopy.terms.readRules} href="/(auth)/normas" numberOfLines={1} style={[textLinkStyle(), { flexShrink: 0 }]}>
          Normas
        </Link>
      </View>
    </View>
  );
}
