import { Text, View } from 'react-native';
import { fontSizes, ink, overlay, radii, semibold, spacing } from '@/theme';

/**
 * El pie de foto de una story, centrado sobre la imagen.
 *
 * Va sobre una cápsula de velo y no sobre la foto a pelo: un texto blanco
 * sobre una foto clara no se lee, y la sombra de texto sola no basta. Es un
 * cartel (`pointerEvents="none"`): los toques siguen llegando a las zonas de
 * avance que tiene debajo.
 */
export function StoryCaption({ text, bottom }: { text: string; bottom: number }) {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, right: 0, bottom, alignItems: 'center', paddingHorizontal: spacing.lg }}
    >
      <Text
        style={{
          maxWidth: '100%',
          overflow: 'hidden',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radii.lg,
          backgroundColor: overlay.scrimSoft,
          color: ink.white,
          fontSize: fontSizes.md,
          fontWeight: semibold,
          lineHeight: 22,
          textAlign: 'center',
        }}
      >
        {text}
      </Text>
    </View>
  );
}
