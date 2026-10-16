import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { MusicPlaylist } from '@gymsheet/schemas';
import { confirm } from '@gymsheet/notifications';
import { BottomSheet } from '@/components/bottom-sheet';
import { ErrorState } from '@/components/feedback';
import { PressableScale, SegmentLabel, SegmentedPill } from '@/components/motion';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { notify } from '@/notifications';
import { colors, fontSizes, gutter, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';
import { AddPlaylistSheet } from '@/features/music/add-playlist-sheet';
import {
  PLAYLIST_CARD_WIDTH,
  PlaylistCard,
  PlaylistCardSkeleton,
  openInSpotify,
} from '@/features/music/playlist-card';
import { useMusicMutations, useMusicPlaylists, type MusicScope } from '@/features/music/use-music';

const SCOPES: readonly { value: MusicScope; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'public', label: 'Públicas', icon: 'globe-outline' },
  { value: 'private', label: 'Privadas', icon: 'lock-closed-outline' },
];

const EMPTY: Record<MusicScope, { title: string; message: string }> = {
  public: {
    title: 'Aún nadie compartió música',
    message: 'Sé el primero: pega el enlace de tu playlist de Spotify para entrenar.',
  },
  private: {
    title: 'No tienes playlists privadas',
    message: 'Guarda aquí tus enlaces de Spotify; solo tú los ves.',
  },
};

/**
 * «Música» en Rutinas (Pablo, 2026-10-15): playlists de Spotify de la
 * comunidad (Públicas) o tuyas (Privadas, solo tú). Es solo un enlace al
 * proveedor: tocar abre Spotify; aquí no se reproduce nada.
 */
export function MusicSection() {
  const [scope, setScope] = useState<MusicScope>('public');
  const [adding, setAdding] = useState(false);
  const [managing, setManaging] = useState<MusicPlaylist | null>(null);
  const list = useMusicPlaylists(scope);

  return (
    <View style={{ gap: spacing.md }} testID="music-section">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text accessibilityRole="header" style={{ flex: 1 }} variant="title">
          Música
        </Text>
        <PressableScale
          accessibilityLabel="Añadir música de Spotify"
          haptic="selection"
          onPress={() => setAdding(true)}
          scaleTo={0.94}
          style={{
            minHeight: minTouchTarget,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            paddingHorizontal: spacing.md,
            borderRadius: radii.full,
            backgroundColor: colors.surfaceHigh,
          }}
          testID="add-playlist"
        >
          <Ionicons color={colors.text} name="add" size={iconSizes.sm} />
          <Text strong variant="subhead">
            Añadir
          </Text>
        </PressableScale>
      </View>

      <SegmentedPill
        fill
        itemStyle={{ minHeight: minTouchTarget, flexGrow: 1, flexBasis: 0, alignItems: 'center', justifyContent: 'center' }}
        onChange={setScope}
        options={SCOPES.map((item) => ({ value: item.value, accessibilityLabel: `Música ${item.label}` }))}
        pillColor={colors.surfaceHighest}
        renderItem={(option, active) => {
          const item = SCOPES.find((candidate) => candidate.value === option.value);
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Ionicons
                color={active ? colors.volt : colors.textMuted}
                name={item?.icon ?? 'ellipse-outline'}
                size={iconSizes.sm}
              />
              <SegmentLabel
                active={active}
                activeColor={colors.text}
                inactiveColor={colors.textMuted}
                label={item?.label ?? ''}
                style={{ fontSize: fontSizes.sm, fontWeight: semibold }}
              />
            </View>
          );
        }}
        style={{ alignSelf: 'stretch', borderRadius: radii.full, backgroundColor: colors.surfaceLow, padding: spacing.xs }}
        value={scope}
      />

      {list.isPending ? (
        <Carousel testID="music-loading">
          <PlaylistCardSkeleton />
          <PlaylistCardSkeleton />
          <PlaylistCardSkeleton />
        </Carousel>
      ) : list.isError && list.items.length === 0 ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : list.items.length === 0 ? (
        <View
          style={{
            gap: spacing.sm,
            padding: spacing.lg,
            borderRadius: radii.xl,
            borderCurve: 'continuous',
            backgroundColor: colors.surfaceLow,
            alignItems: 'flex-start',
          }}
          testID={`music-empty-${scope}`}
        >
          <Ionicons color={colors.textMuted} name="musical-notes-outline" size={iconSizes.lg} />
          <Text strong variant="body">
            {EMPTY[scope].title}
          </Text>
          <Text tone="muted" variant="subhead">
            {EMPTY[scope].message}
          </Text>
          <Button icon="add" label="Añadir música" onPress={() => setAdding(true)} size="sm" variant="secondary" />
        </View>
      ) : (
        <Carousel testID={`music-list-${scope}`}>
          {list.items.map((playlist) => (
            <PlaylistCard key={playlist.id} onManage={() => setManaging(playlist)} playlist={playlist} />
          ))}
          {list.hasNextPage ? (
            <View style={{ width: PLAYLIST_CARD_WIDTH * 0.6, height: PLAYLIST_CARD_WIDTH, justifyContent: 'center' }}>
              <Button
                label="Ver más"
                loading={list.isFetchingNextPage}
                onPress={() => void list.fetchNextPage()}
                size="sm"
                variant="ghost"
              />
            </View>
          ) : null}
        </Carousel>
      )}

      <AddPlaylistSheet
        initialVisibility={scope === 'private' ? 'PRIVATE' : 'PUBLIC'}
        onClose={() => setAdding(false)}
        visible={adding}
      />
      <ManageSheet onClose={() => setManaging(null)} playlist={managing} />
    </View>
  );
}

/** Carrusel a sangre: corre hasta el borde y la primera tarjeta arranca en el margen. */
function Carousel({ children, testID }: { children: React.ReactNode; testID?: string }) {
  return (
    <ScrollView
      contentContainerStyle={{ gap: spacing.md, paddingHorizontal: gutter }}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -gutter }}
      testID={testID}
    >
      {children}
    </ScrollView>
  );
}

/** Lo que puedes hacer con una playlist tuya: abrirla, cambiar quién la ve o borrarla. */
function ManageSheet({ playlist, onClose }: { playlist: MusicPlaylist | null; onClose: () => void }) {
  const { setVisibility, remove } = useMusicMutations();
  if (!playlist) return null;
  const toPublic = playlist.visibilidad === 'PRIVATE';

  const onRemove = async () => {
    const result = await confirm({
      title: 'Quitar playlist',
      message: 'Se quita de REPP. En Spotify sigue igual.',
      confirmLabel: 'Quitar',
      cancelLabel: 'Cancelar',
      severity: 'danger',
    });
    if (!result.confirmed) return;
    remove.mutate(playlist.id, {
      onSuccess: () => {
        notify.success('Playlist quitada.');
        onClose();
      },
      onError: (error: Error) => notify.error(error),
    });
  };

  return (
    <BottomSheet onClose={onClose} subtitle={playlist.titulo} title="Tu playlist" visible>
      <View style={{ gap: spacing.sm }}>
        <Button icon="open-outline" label="Abrir en Spotify" onPress={() => void openInSpotify(playlist.url)} variant="secondary" />
        <Button
          icon={toPublic ? 'globe-outline' : 'lock-closed-outline'}
          label={toPublic ? 'Compartir con la comunidad' : 'Hacerla privada'}
          loading={setVisibility.isPending}
          onPress={() =>
            setVisibility.mutate(
              { id: playlist.id, visibilidad: toPublic ? 'PUBLIC' : 'PRIVATE' },
              {
                onSuccess: () => {
                  notify.success(toPublic ? 'Ahora la ve la comunidad.' : 'Ahora solo la ves tú.');
                  onClose();
                },
                onError: (error: Error) => notify.error(error),
              },
            )
          }
          variant="secondary"
        />
        <Button label="Quitar" loading={remove.isPending} onPress={() => void onRemove()} variant="danger" />
      </View>
    </BottomSheet>
  );
}
