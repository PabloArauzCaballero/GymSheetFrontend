import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { personInitials } from '@gymsheet/hooks';
import { MediaImage } from '@/components/media-image';
import { Text } from '@/components/text';
import { accentPolicy, avatarHues, colors, fontSizes, ink, radii, semibold } from '@/theme';

/** El mismo id da siempre el mismo color: la persona se reconoce de una tarjeta a otra. */
function hueFor(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  return avatarHues[Math.abs(hash) % avatarHues.length] ?? avatarHues[0];
}

/**
 * Avatar de una persona: su foto de perfil o, si no subió ninguna, sus
 * iniciales sobre un color fijo por persona (como Slack o Gmail). La cuenta
 * oficial de REPP lleva un sello en vez de iniciales. Decorativo para el
 * lector de pantalla: el nombre va escrito al lado.
 */
export function PersonAvatar({
  id,
  name,
  photoUrl,
  size = 40,
  official = false,
  ring = false,
}: {
  id: string;
  name: string;
  photoUrl?: string | null;
  size?: number;
  official?: boolean;
  /** Aro del color del lienzo: para montarlo sobre una imagen o sobre otro avatar. */
  ring?: boolean;
}) {
  const frame = {
    width: size,
    height: size,
    borderRadius: radii.full,
    ...(ring ? { borderWidth: 2, borderColor: colors.background } : null),
  };
  const initials = (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: official ? colors.surfaceHighest : hueFor(id || name),
      }}
    >
      {official ? (
        <Ionicons color={accentPolicy.ink} name="checkmark-circle" size={Math.round(size * 0.55)} />
      ) : (
        <Text
          style={{
            color: ink.white,
            fontSize: size >= 48 ? fontSizes.lg : size >= 36 ? fontSizes.sm : fontSizes.xs,
            fontWeight: semibold,
            letterSpacing: 0.3,
          }}
        >
          {personInitials(name)}
        </Text>
      )}
    </View>
  );
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={frame}>
      <MediaImage fallback={initials} style={{ flex: 1, borderRadius: radii.full }} uri={official ? null : photoUrl} />
    </View>
  );
}
