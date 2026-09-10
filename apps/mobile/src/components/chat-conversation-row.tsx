import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { ConversationSummary } from '@gymsheet/schemas';
import { NavRow } from '@/components/list';
import { chatTimestampLabel, initialsOf } from '@/lib/format';
import { colors, fontSizes, radii } from '@/theme';

const AVATAR_SIZE = 52;

/** `null` para un chat normal — sin distintivo. */
const SYSTEM_KIND_ICON: Record<NonNullable<ConversationSummary['systemKind']>, keyof typeof Ionicons.glyphMap> = {
  CORPORATE: 'business',
  TENANT_ADMIN: 'shield-checkmark',
};

/**
 * Una fila de la lista de chats — mismo lenguaje que WhatsApp/Tinder: foto
 * grande, punto verde si está en línea ahora mismo, y la hora del último
 * mensaje donde el ojo ya espera encontrarla (antes de la flecha). Vive aquí
 * y no en cada pantalla porque `/chat` y "Mensajes → General" mostraban la
 * misma fila con dos implementaciones ligeramente distintas.
 */
export function ChatConversationRow({
  conversation,
  onPress,
}: {
  conversation: ConversationSummary;
  onPress: () => void;
}) {
  return (
    <NavRow
      leading={
        <View>
          {conversation.otherUserPhotoUrl ? (
            <Image
              contentFit="cover"
              source={{ uri: conversation.otherUserPhotoUrl }}
              style={{
                width: AVATAR_SIZE,
                height: AVATAR_SIZE,
                borderRadius: radii.full,
                backgroundColor: colors.surfaceHigh,
              }}
            />
          ) : (
            <View
              style={{
                width: AVATAR_SIZE,
                height: AVATAR_SIZE,
                borderRadius: radii.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.volt,
              }}
            >
              <Text style={{ color: colors.background, fontSize: fontSizes.md, fontWeight: '700' }}>
                {initialsOf(conversation.otherUserName, undefined)}
              </Text>
            </View>
          )}
          {conversation.otherUserOnline ? (
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 14,
                height: 14,
                borderRadius: radii.full,
                backgroundColor: colors.success,
                borderWidth: 2,
                borderColor: colors.background,
              }}
            />
          ) : null}
          {conversation.systemKind ? (
            <View
              style={{
                position: 'absolute',
                top: -2,
                left: -2,
                width: 20,
                height: 20,
                borderRadius: radii.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.volt,
                borderWidth: 2,
                borderColor: colors.background,
              }}
            >
              <Ionicons color={colors.background} name={SYSTEM_KIND_ICON[conversation.systemKind]} size={11} />
            </View>
          ) : null}
        </View>
      }
      meta={
        conversation.lastMessageAt ? (
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
            {chatTimestampLabel(conversation.lastMessageAt)}
          </Text>
        ) : null
      }
      onPress={onPress}
      subtitle={conversation.lastMessage ?? 'Todavía sin mensajes.'}
      title={conversation.nickname ?? conversation.otherUserName}
    />
  );
}
