import { Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { GymDirectoryEntry } from '@gymsheet/schemas';
import { Button } from '@/components/ui';
import { initialsOf } from '@/lib/format';
import { colors, fontSizes, iconSizes, onMedia, overlay, radii, spacing } from '@/theme';

const MATCH_SCRIM = [overlay.scrimSoft, overlay.scrimStrong] as const;
const AVATAR = 104;

function MatchAvatar({ name, photoUrl, mine }: { name: string; photoUrl: string | null; mine: boolean }) {
  if (photoUrl) {
    return (
      <Image
        cachePolicy="memory-disk"
        contentFit="cover"
        source={{ uri: photoUrl }}
        style={{ width: AVATAR, height: AVATAR, borderRadius: radii.full, borderWidth: 3, borderColor: colors.volt }}
      />
    );
  }
  return (
    <View
      style={{
        width: AVATAR,
        height: AVATAR,
        borderRadius: radii.full,
        backgroundColor: mine ? colors.volt : colors.surfaceHigh,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: mine ? colors.background : colors.text, fontSize: fontSizes.xl, fontWeight: '700' }}>
        {initialsOf(name, undefined)}
      </Text>
    </View>
  );
}

/** Full-screen match celebration with a shortcut to the new conversation. */
export function MatchModal({
  matchedEntry,
  messaging,
  myName,
  myPhotoUrl,
  onClose,
  onMessage,
  reduceMotion,
}: {
  matchedEntry: GymDirectoryEntry | null;
  messaging: boolean;
  myName: string;
  myPhotoUrl: string | null;
  onClose: () => void;
  onMessage: () => void;
  reduceMotion: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={Boolean(matchedEntry)}
    >
      <View accessibilityViewIsModal style={{ flex: 1, backgroundColor: colors.background }}>
        {matchedEntry?.photoUrl ? (
          <Image
            blurRadius={40}
            cachePolicy="memory-disk"
            contentFit="cover"
            recyclingKey={matchedEntry.photoUrl}
            source={{ uri: matchedEntry.photoUrl }}
            style={StyleSheet.absoluteFill}
            transition={160}
          />
        ) : null}
        <LinearGradient colors={MATCH_SCRIM} style={StyleSheet.absoluteFill} />

        <View
          style={{
            flex: 1,
            alignItems: 'center',
            paddingTop: insets.top + spacing.xl,
            paddingBottom: insets.bottom + spacing.lg,
            paddingHorizontal: spacing.lg,
          }}
        >
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl }}>
            <View style={{ alignItems: 'center', gap: spacing.sm }}>
              <Text
                accessibilityRole="header"
                style={{ color: colors.volt, fontSize: fontSizes.display, fontWeight: '800', letterSpacing: -1, textAlign: 'center' }}
              >
                ¡Match de Gym!
              </Text>
              <Text style={{ color: onMedia.text, fontSize: fontSizes.md, lineHeight: 22, textAlign: 'center' }}>
                {matchedEntry ? `A ${matchedEntry.displayName} también le interesa entrenar contigo.` : ''}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <MatchAvatar mine name={myName} photoUrl={myPhotoUrl} />
              <Ionicons color={colors.volt} name="heart" size={iconSizes.xl + 8} />
              <MatchAvatar mine={false} name={matchedEntry?.displayName ?? ''} photoUrl={matchedEntry?.photoUrl ?? null} />
            </View>
          </View>

          <View style={{ alignSelf: 'stretch', gap: spacing.sm }}>
            <Button icon="chatbubble-outline" label="Enviar mensaje ahora" loading={messaging} onPress={onMessage} />
            <Button icon="flame-outline" label="Seguir explorando" onPress={onClose} variant="ghost" />
          </View>
        </View>
      </View>
    </Modal>
  );
}
