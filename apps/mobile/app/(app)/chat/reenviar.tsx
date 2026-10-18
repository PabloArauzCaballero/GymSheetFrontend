import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ConversationSummary, Message } from '@gymsheet/schemas';
import { chatService } from '@/api/services';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/feedback';
import { PressableScale } from '@/components/motion';
import { Button } from '@/components/ui';
import { messagePreviewText } from '@/hooks/chat-reply';
import { initialsOf } from '@/lib/format';
import { notify } from '@/notifications';
import { accentPolicy, colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

/** Como WhatsApp: un mensaje se reenvía a cinco chats como mucho de una vez. */
const MAX_TARGETS = 5;

function Avatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  if (photoUrl) {
    return (
      <Image
        cachePolicy="memory-disk"
        contentFit="cover"
        recyclingKey={photoUrl}
        source={{ uri: photoUrl }}
        style={{ width: 44, height: 44, borderRadius: radii.full, backgroundColor: colors.surfaceHigh }}
      />
    );
  }
  return (
    <View style={{ width: 44, height: 44, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHighest }}>
      <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: semibold }}>{initialsOf(name, undefined)}</Text>
    </View>
  );
}

/**
 * «Reenviar a…»: una pantalla de la pila (no una hoja encima de otra) con los
 * chats donde se puede escribir, un buscador y hasta cinco destinos. El
 * servidor copia el mensaje (y el archivo, si lo hay) y lo marca «Reenviado».
 */
export default function ChatForwardScreen() {
  const { fromConversationId, messageId } = useLocalSearchParams<{ fromConversationId: string; messageId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const conversations = useQuery({ queryKey: ['chat', 'conversations'], queryFn: () => chatService.listConversations() });
  const original = useMemo(() => {
    const pages = queryClient.getQueryData<Message[]>(['chat', 'messages', fromConversationId]) ?? [];
    return pages.find((message) => message.id === messageId) ?? null;
  }, [fromConversationId, messageId, queryClient]);

  const chats = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('es');
    return (conversations.data ?? [])
      .filter((chat) => chat.canWrite && chat.systemKind === null)
      .filter((chat) => !needle || (chat.nickname ?? chat.otherUserName).toLocaleLowerCase('es').includes(needle));
  }, [conversations.data, query]);

  const nameOf = (chat: ConversationSummary) => chat.nickname ?? chat.otherUserName;
  const close = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/chat/[id]', params: { id: fromConversationId } }));

  function toggle(conversationId: string) {
    setSelected((current) => current.includes(conversationId)
      ? current.filter((id) => id !== conversationId)
      : current.length < MAX_TARGETS ? [...current, conversationId] : current);
  }

  async function forward() {
    if (!selected.length || sending || !fromConversationId || !messageId) return;
    setSending(true);
    const results = await Promise.allSettled(
      selected.map((target) => chatService.forwardMessage(target, fromConversationId, messageId)),
    );
    setSending(false);
    void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    for (const target of selected) void queryClient.invalidateQueries({ queryKey: ['chat', 'messages', target] });
    const failed = results.filter((result) => result.status === 'rejected');
    if (failed.length === results.length) {
      const reason = failed[0]?.status === 'rejected' && failed[0].reason instanceof Error ? failed[0].reason.message : null;
      notify.error(reason ?? 'No se pudo reenviar el mensaje.');
      return;
    }
    if (failed.length) notify.info(`Se reenvió a ${results.length - failed.length} de ${results.length} chats.`);
    else notify.success(results.length === 1 ? 'Mensaje reenviado.' : `Reenviado a ${results.length} chats.`);
    // A un solo chat: se abre ese chat, como en WhatsApp. A varios: vuelta al de origen.
    if (selected.length === 1 && !failed.length) router.replace({ pathname: '/chat/[id]', params: { id: selected[0]! } });
    else close();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
        }}
      >
        <PressableScale
          accessibilityLabel="Volver al chat"
          haptic="none"
          onPress={close}
          scaleTo={0.9}
          style={{ width: minTouchTarget, height: minTouchTarget, justifyContent: 'center' }}
        >
          <Ionicons color={colors.text} name="chevron-back" size={iconSizes.lg + 2} />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: semibold }}>Reenviar a…</Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
            {selected.length ? `${selected.length} de ${MAX_TARGETS} seleccionados` : `Elige hasta ${MAX_TARGETS} chats`}
          </Text>
        </View>
      </View>

      {original && original.type !== 'system' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surfaceLow }}>
          <Ionicons color={colors.textMuted} name="arrow-redo" size={iconSizes.sm} />
          <Text numberOfLines={2} style={{ flex: 1, color: colors.textSecondary, fontSize: fontSizes.sm }}>{messagePreviewText(original)}</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.md, marginBottom: spacing.sm, paddingHorizontal: spacing.md, minHeight: minTouchTarget, borderRadius: radii.full, backgroundColor: colors.surfaceHigh }}>
        <Ionicons color={colors.textMuted} name="search" size={iconSizes.sm} />
        <TextInput
          accessibilityLabel="Buscar chat"
          autoCorrect={false}
          keyboardAppearance="dark"
          onChangeText={setQuery}
          placeholder="Buscar"
          placeholderTextColor={colors.textMuted}
          style={{ flex: 1, color: colors.text, fontSize: fontSizes.md, paddingVertical: spacing.sm }}
          value={query}
        />
      </View>

      {conversations.isPending ? (
        <View style={{ paddingHorizontal: spacing.md }}><RowsSkeleton thumb={44} /></View>
      ) : conversations.isError ? (
        <ErrorState error={conversations.error} onRetry={() => void conversations.refetch()} />
      ) : (
        <FlatList
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.lg }}
          data={chats}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(chat) => chat.conversationId}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              message={query ? 'Prueba con otro nombre.' : 'Cuando tengas conversaciones aparecerán aquí.'}
              title={query ? 'Ningún chat con ese nombre' : 'Sin chats donde reenviar'}
            />
          }
          renderItem={({ item: chat }) => {
            const checked = selected.includes(chat.conversationId);
            const full = !checked && selected.length >= MAX_TARGETS;
            return (
              <PressableScale
                accessibilityLabel={nameOf(chat)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked, disabled: full }}
                disabled={full}
                haptic="selection"
                onPress={() => toggle(chat.conversationId)}
                scaleTo={0.98}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60, opacity: full ? 0.5 : 1 }}
                testID={`chat-forward-${chat.conversationId}`}
              >
                <Avatar name={chat.otherUserName} photoUrl={chat.otherUserPhotoUrl} />
                <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: fontSizes.md }}>{nameOf(chat)}</Text>
                <Ionicons
                  color={checked ? accentPolicy.ink : colors.textMuted}
                  name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                  size={iconSizes.lg}
                />
              </PressableScale>
            );
          }}
        />
      )}

      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.md, borderTopWidth: 1, borderTopColor: colors.borderSubtle }}>
        <Button
          disabled={!selected.length}
          icon="send"
          label={selected.length > 1 ? `Reenviar a ${selected.length} chats` : 'Reenviar'}
          loading={sending}
          onPress={() => void forward()}
          testID="chat-forward-send"
        />
      </View>
    </View>
  );
}
