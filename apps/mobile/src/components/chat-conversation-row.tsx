import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { conversationControls, type ChatViewer } from '@gymsheet/domain';
import type { ConversationSummary } from '@gymsheet/schemas';
import { PressableScale } from '@/components/motion';
import { PersonAvatar } from '@/components/person-avatar';
import { Text } from '@/components/text';
import { chatTimestampLabel } from '@/lib/format';
import { colors, comfortableTouchTarget, radii, spacing } from '@/theme';

const AVATAR_SIZE = 52;

/** `null` para un chat normal — sin distintivo. */
const SYSTEM_KIND_ICON: Record<NonNullable<ConversationSummary['systemKind']>, keyof typeof Ionicons.glyphMap> = {
  CORPORATE: 'business',
};

/**
 * Una fila de la lista de chats, con la forma que el ojo ya conoce de
 * cualquier app de mensajería: avatar, nombre y hora en la misma línea, y la
 * vista previa debajo a todo el ancho.
 *
 * Antes era un `NavRow`: la hora y una flecha se comían el final de la vista
 * previa («¿Mañana a las 7 hace…») y la flecha no decía nada que la fila
 * entera no dijera ya. El avatar sin foto se rellenaba con el acento —
 * prohibido por `accentPolicy` («nunca volt en avatares de iniciales»)— y la
 * misma persona salía en jade aquí y en su color propio en Conexiones; ahora
 * es `PersonAvatar` en los dos sitios.
 *
 * Franja 8f: a chat with a business is marked «Negocio» for the person; the
 * business inbox reuses the row (`viewer="business"`) without presence.
 */
export function ChatConversationRow({
  conversation,
  onPress,
  viewer = 'person',
}: {
  conversation: ConversationSummary;
  onPress: () => void;
  viewer?: ChatViewer;
}) {
  const controls = conversationControls(conversation, viewer);
  const name = conversation.nickname ?? conversation.otherUserName;
  const preview = conversation.lastMessage ?? 'Todavía sin mensajes.';
  const time = conversation.lastMessageAt ? chatTimestampLabel(conversation.lastMessageAt) : null;
  const online = controls.presence && conversation.otherUserOnline;

  return (
    <PressableScale
      accessibilityHint="Abre el chat"
      accessibilityLabel={[name, controls.businessBadge ? 'negocio' : null, online ? 'en línea' : null, preview, time].filter(Boolean).join('. ')}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.smd,
        minHeight: comfortableTouchTarget,
        paddingVertical: spacing.smd,
      }}
    >
      <View>
        <PersonAvatar
          id={conversation.otherUserId}
          name={conversation.otherUserName}
          photoUrl={conversation.otherUserPhotoUrl}
          size={AVATAR_SIZE}
        />
        {online ? (
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
              backgroundColor: colors.surfaceHighest,
              borderWidth: 2,
              borderColor: colors.background,
            }}
          >
            <Ionicons color={colors.accentInk} name={SYSTEM_KIND_ICON[conversation.systemKind]} size={11} />
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
          <Text numberOfLines={1} style={{ flexShrink: 1 }} variant="headline">
            {name}
          </Text>
          {controls.businessBadge ? (
            <Text tone="muted" variant="caption">
              Negocio
            </Text>
          ) : null}
          <View style={{ flex: 1 }} />
          {time ? (
            <Text tabular tone="muted" variant="caption">
              {time}
            </Text>
          ) : null}
        </View>
        <Text numberOfLines={2} tone="muted" variant="subhead">
          {preview}
        </Text>
      </View>
    </PressableScale>
  );
}
