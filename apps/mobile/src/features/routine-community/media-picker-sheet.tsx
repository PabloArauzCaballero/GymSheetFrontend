import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CommentAttachment, GifItem } from '@gymsheet/types';
import { communityService } from '@/api/services';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { EMOJI_CATEGORIES } from '@/features/routine-community/emoji-data';
import { colors, fontSizes, minTouchTarget, overlay, radii, spacing } from '@/theme';

type Tab = 'emoji' | 'gifs' | 'stickers';

const TABS: readonly { key: Tab; label: string }[] = [
  { key: 'emoji', label: 'Emojis' },
  { key: 'gifs', label: 'GIF' },
  { key: 'stickers', label: 'Stickers' },
];
const COLUMNS = 3;
const GAP = spacing.xs;

/** Espera `ms` tras la última letra para no pedir un GIF por cada tecla. */
function useDebounced(value: string, ms = 350): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

function EmojiPanel({ onEmoji }: { onEmoji: (emoji: string) => void }) {
  const [category, setCategory] = useState(EMOJI_CATEGORIES[0]!.key);
  const active = EMOJI_CATEGORIES.find((c) => c.key === category) ?? EMOJI_CATEGORIES[0]!;
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ gap: spacing.xs, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
      >
        {EMOJI_CATEGORIES.map((c) => (
          <PressableScale
            accessibilityLabel={`Categoría ${c.key}`}
            haptic="selection"
            key={c.key}
            onPress={() => setCategory(c.key)}
            style={{
              width: 44,
              height: 40,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: c.key === category ? colors.surfaceHighest : 'transparent',
            }}
          >
            <Text style={{ fontSize: fontSizes.lg }}>{c.icon}</Text>
          </PressableScale>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md }}>
        {active.emojis.map((emoji) => (
          <PressableScale
            accessibilityLabel={emoji}
            haptic="selection"
            key={emoji}
            onPress={() => onEmoji(emoji)}
            scaleTo={0.8}
            style={{ width: `${100 / 8}%`, height: 46, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: fontSizes.xl }}>{emoji}</Text>
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
}

function GifPanel({ tipo, onPick }: { tipo: 'gifs' | 'stickers'; onPick: (attachment: CommentAttachment) => void }) {
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const query = useInfiniteQuery({
    queryKey: ['community', 'gifs', tipo, q],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => communityService.gifs(tipo, q, pageParam),
    getNextPageParam: (last) => last.siguiente,
    staleTime: 5 * 60 * 1000,
  });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const available = query.data?.pages[0]?.disponible ?? true;

  return (
    <View style={{ flex: 1, gap: spacing.sm }}>
      <View
        style={{
          marginHorizontal: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          height: 40,
          paddingHorizontal: spacing.md,
          borderRadius: radii.full,
          backgroundColor: colors.surfaceHigh,
        }}
      >
        <Ionicons color={colors.textMuted} name="search" size={18} />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          cursorColor={colors.volt}
          keyboardAppearance="dark"
          onChangeText={setSearch}
          placeholder={tipo === 'gifs' ? 'Buscar GIFs' : 'Buscar stickers'}
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          selectionColor={colors.volt}
          style={{ flex: 1, color: colors.text, fontSize: fontSizes.sm, padding: 0 }}
          value={search}
        />
      </View>
      {query.isPending ? (
        <ActivityIndicator color={colors.volt} style={{ marginTop: spacing.xl }} />
      ) : !available || query.isError ? (
        <Text style={{ textAlign: 'center', padding: spacing.xl }} tone="muted" variant="subhead">
          El buscador no está disponible ahora. Inténtalo en un rato.
        </Text>
      ) : items.length === 0 ? (
        <Text style={{ textAlign: 'center', padding: spacing.xl }} tone="muted" variant="subhead">
          Sin resultados para «{q}».
        </Text>
      ) : (
        <FlatList<GifItem>
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{ gap: GAP, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}
          data={items}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => item.id}
          numColumns={COLUMNS}
          onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && void query.fetchNextPage()}
          onEndReachedThreshold={0.6}
          renderItem={({ item }) => (
            <PressableScale
              accessibilityLabel={item.titulo || (tipo === 'gifs' ? 'GIF' : 'Sticker')}
              haptic="selection"
              onPress={() =>
                onPick({
                  tipo: tipo === 'gifs' ? 'GIF' : 'STICKER',
                  url: item.url,
                  nombre: item.titulo || null,
                  ancho: item.ancho,
                  alto: item.alto,
                })
              }
              scaleTo={0.94}
              style={{
                flex: 1 / COLUMNS,
                aspectRatio: 1,
                borderRadius: radii.md,
                borderCurve: 'continuous',
                overflow: 'hidden',
                backgroundColor: colors.surfaceHigh,
              }}
            >
              <Image
                cachePolicy="memory-disk"
                contentFit={tipo === 'gifs' ? 'cover' : 'contain'}
                source={{ uri: item.vistaPreviaUrl }}
                style={{ width: '100%', height: '100%' }}
              />
            </PressableScale>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
      <Text style={{ textAlign: 'center', paddingBottom: spacing.xs }} tone="muted" variant="caption">
        Con tecnología de GIPHY
      </Text>
    </View>
  );
}

/**
 * Selector de emojis, GIFs y stickers: una hoja con tres pestañas. Un emoji se
 * inserta en el texto sin cerrar la hoja (se pueden poner varios); un GIF o un
 * sticker se adjunta y la hoja se cierra.
 */
export function MediaPickerSheet({
  visible,
  onClose,
  onEmoji,
  onAttachment,
  initialTab = 'emoji',
}: {
  visible: boolean;
  onClose: () => void;
  onEmoji: (emoji: string) => void;
  onAttachment: (attachment: CommentAttachment) => void;
  initialTab?: Tab;
}) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>(initialTab);
  useEffect(() => {
    if (visible) setTab(initialTab);
  }, [visible, initialTab]);

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityLabel="Cerrar"
          onPress={onClose}
          style={{ position: 'absolute', inset: 0, backgroundColor: overlay.scrimSoft }}
        />
        <View
          accessibilityViewIsModal
          style={{
            height: '62%',
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            paddingTop: spacing.sm,
            paddingBottom: insets.bottom,
            gap: spacing.sm,
          }}
        >
          <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, gap: spacing.sm }}>
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                padding: 3,
                borderRadius: radii.full,
                backgroundColor: colors.surfaceHigh,
              }}
            >
              {TABS.map((t) => (
                <PressableScale
                  accessibilityState={{ selected: t.key === tab }}
                  haptic="selection"
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  scaleTo={0.97}
                  style={{
                    flex: 1,
                    height: 34,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: radii.full,
                    backgroundColor: t.key === tab ? colors.surfaceHighest : 'transparent',
                  }}
                >
                  <Text strong tone={t.key === tab ? 'default' : 'muted'} variant="footnote">
                    {t.label}
                  </Text>
                </PressableScale>
              ))}
            </View>
            <PressableScale
              accessibilityLabel="Cerrar"
              haptic="none"
              onPress={onClose}
              style={{ width: minTouchTarget - 8, height: minTouchTarget - 8, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons color={colors.textSecondary} name="close" size={22} />
            </PressableScale>
          </View>
          {tab === 'emoji' ? (
            <EmojiPanel onEmoji={onEmoji} />
          ) : (
            <GifPanel
              key={tab}
              onPick={(attachment) => {
                onAttachment(attachment);
                onClose();
              }}
              tipo={tab}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
