import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import { PressableScale } from '@/components/motion';
import { initialsOf } from '@/lib/format';
import { accentPolicy, colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';
import { disappearingModeLabel } from './chat-sheets';

const AVATAR = 38;

/**
 * La cabecera del hilo, como WhatsApp: volver, avatar con el punto de «en
 * línea», nombre y debajo el estado («escribiendo…», «en línea», «últ. vez…»).
 * Tocar a la persona abre su ficha; a la derecha, «Entrenemos juntos» y más.
 */
export function ChatHeader({
  displayName,
  name,
  photoUrl,
  online,
  presence,
  typing,
  disappearingSeconds,
  onBack,
  onOpenContact,
  onTrainTogether,
}: {
  displayName: string | undefined;
  name: string | undefined;
  photoUrl: string | null;
  online: boolean;
  presence: string;
  typing: boolean;
  disappearingSeconds: number | null | undefined;
  onBack: () => void;
  onOpenContact: () => void;
  onTrainTogether: (() => void) | null;
}) {
  const status = typing ? 'escribiendo…' : presence;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        minHeight: minTouchTarget + 8,
        paddingRight: spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
        backgroundColor: colors.surfaceLow,
      }}
    >
      <PressableScale
        accessibilityLabel="Volver"
        haptic="none"
        onPress={onBack}
        scaleTo={0.9}
        style={{ width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons color={colors.text} name="chevron-back" size={iconSizes.lg + 2} />
      </PressableScale>
      <PressableScale
        accessibilityHint="Abre la info del contacto: apodo, mensajes temporales y visto de este chat"
        accessibilityLabel={`${displayName ?? 'Conversación'}, ${status}`}
        haptic="none"
        onPress={onOpenContact}
        scaleTo={0.98}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: minTouchTarget }}
        testID="chat-contact-header"
      >
        <View>
          {photoUrl ? (
            <Image
              cachePolicy="memory-disk"
              contentFit="cover"
              recyclingKey={photoUrl}
              source={{ uri: photoUrl }}
              style={{ width: AVATAR, height: AVATAR, borderRadius: radii.full, backgroundColor: colors.surfaceHigh }}
            />
          ) : (
            <View
              style={{
                width: AVATAR,
                height: AVATAR,
                borderRadius: radii.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surfaceHighest,
              }}
            >
              <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: semibold }}>{initialsOf(name, undefined)}</Text>
            </View>
          )}
          {disappearingSeconds ? (
            <View
              accessibilityLabel={`Mensajes temporales: ${disappearingModeLabel(disappearingSeconds)}`}
              style={{
                position: 'absolute',
                bottom: -2,
                left: -2,
                width: 18,
                height: 18,
                borderRadius: radii.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surfaceHighest,
                borderWidth: 2,
                borderColor: colors.surfaceLow,
              }}
              testID="chat-header-disappearing"
            >
              <Ionicons color={colors.text} name="timer-outline" size={11} />
            </View>
          ) : null}
          {online ? (
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 12,
                height: 12,
                borderRadius: radii.full,
                backgroundColor: colors.success,
                borderWidth: 2,
                borderColor: colors.surfaceLow,
              }}
            />
          ) : null}
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text
            numberOfLines={1}
            style={{ color: colors.text, fontSize: fontSizes.callout, fontWeight: semibold, letterSpacing: fontSizes.callout * -0.01 }}
          >
            {displayName ?? 'Conversación'}
          </Text>
          <Text
            accessibilityLiveRegion="polite"
            numberOfLines={1}
            style={{ color: typing ? accentPolicy.ink : online ? colors.success : colors.textMuted, fontSize: fontSizes.xs }}
          >
            {status}
            {disappearingSeconds && !typing ? ` · Temporales: ${disappearingModeLabel(disappearingSeconds)}` : ''}
          </Text>
        </View>
      </PressableScale>
      {onTrainTogether ? (
        <PressableScale
          accessibilityLabel="Entrenemos juntos"
          accessibilityHint="Propón día, hora y lugar para entrenar"
          haptic="light"
          onPress={onTrainTogether}
          scaleTo={0.9}
          style={{ width: minTouchTarget, height: minTouchTarget, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons color={colors.text} name="barbell-outline" size={iconSizes.md + 2} />
        </PressableScale>
      ) : null}
      <PressableScale
        accessibilityLabel="Info. del contacto"
        accessibilityRole="button"
        haptic="none"
        onPress={onOpenContact}
        scaleTo={0.9}
        style={{ width: minTouchTarget, height: minTouchTarget, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons color={colors.text} name="ellipsis-vertical" size={iconSizes.md} />
      </PressableScale>
    </View>
  );
}
