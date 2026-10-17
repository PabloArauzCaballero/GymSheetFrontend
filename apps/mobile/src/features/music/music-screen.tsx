import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import type { MusicPlaylist } from '@gymsheet/schemas';
import { confirm } from '@gymsheet/notifications';
import { BottomSheet } from '@/components/bottom-sheet';
import { EmptyState, ErrorState } from '@/components/feedback';
import { ScreenHeader, ScrollScreen } from '@/components/layout';
import { EnterUp, PressableScale, SegmentLabel, SegmentedPill } from '@/components/motion';
import { BackLink } from '@/components/nav';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { notify } from '@/notifications';
import { accentContrast, colors, fontSizes, gutter, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';
import { AddPlaylistSheet } from '@/features/music/add-playlist-sheet';
import { PlaylistCard, PlaylistCardSkeleton, openInSpotify } from '@/features/music/playlist-card';
import { useMusicMutations, useMusicPlaylists } from '@/features/music/use-music';

type MusicTab = 'all' | 'shared';

/** Mismas pestañas que Rutinas: icono y una palabra. */
const TABS: readonly { value: MusicTab; label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'all', label: 'Todas', icon: 'grid-outline', iconActive: 'grid' },
  { value: 'shared', label: 'Compartidas', icon: 'people-outline', iconActive: 'people' },
];

const EMPTY: Record<MusicTab, { title: string; message: string }> = {
  all: {
    title: 'Aún no hay música',
    message: 'Pega el enlace de tu playlist de Spotify: compártela con la comunidad o guárdala solo para ti.',
  },
  shared: {
    title: 'Nadie compartió música todavía',
    message: 'Cuando alguien de la comunidad comparta una playlist, la verás aquí.',
  },
};

/**
 * Música (Pablo, 2026-10-15): se abre desde la fila de accesos de Rutinas y
 * sigue su misma lógica. «Todas» junta lo público con lo tuyo (lo privado lleva
 * «Solo tú»); «Compartidas», lo que subió la comunidad. Es solo un enlace al
 * proveedor: tocar abre Spotify, aquí no se reproduce nada.
 */
export function MusicScreen() {
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<MusicTab>('all');
  const [adding, setAdding] = useState(false);
  const [managing, setManaging] = useState<MusicPlaylist | null>(null);
  const publicList = useMusicPlaylists('public');
  const privateList = useMusicPlaylists('private');
  const pull = usePullRefresh(() => Promise.all([publicList.refetch(), privateList.refetch()]));

  // «Todas»: primero lo tuyo privado, luego lo público. «Compartidas»: lo de los demás.
  const items =
    tab === 'all' ? [...privateList.items, ...publicList.items] : publicList.items.filter((item) => !item.esMia);
  const pending = publicList.isPending || (tab === 'all' && privateList.isPending);
  const failed = publicList.isError || (tab === 'all' && privateList.isError);
  const hasMore = publicList.hasNextPage || (tab === 'all' && privateList.hasNextPage);
  const loadMore = () =>
    tab === 'all' && privateList.hasNextPage ? privateList.fetchNextPage() : publicList.fetchNextPage();
  const cardWidth = Math.floor((width - gutter * 2 - spacing.md) / 2);

  return (
    <ScrollScreen onRefresh={pull.onRefresh} refreshing={pull.refreshing}>
      <BackLink />
      <ScreenHeader
        action={
          <PressableScale
            accessibilityLabel="Añadir música de Spotify"
            haptic="selection"
            onPress={() => setAdding(true)}
            scaleTo={0.94}
            style={{
              height: minTouchTarget,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              paddingHorizontal: spacing.md,
              borderRadius: radii.full,
              backgroundColor: colors.volt,
            }}
            testID="add-playlist"
          >
            <Ionicons color={accentContrast()} name="add" size={iconSizes.sm} />
            <Text strong tone="onAccent" variant="subhead">
              Añadir
            </Text>
          </PressableScale>
        }
        subtitle="Playlists de Spotify para entrenar. Tocar una la abre en Spotify."
        title="Música"
      />

      <View accessibilityRole="tablist">
        <SegmentedPill
          fill
          itemStyle={{ minHeight: minTouchTarget, flexGrow: 1, flexBasis: 0, alignItems: 'center', justifyContent: 'center' }}
          onChange={setTab}
          options={TABS.map((item) => ({ value: item.value, accessibilityLabel: `Pestaña ${item.label}` }))}
          pillColor={colors.surfaceHighest}
          renderItem={(option, active) => {
            const item = TABS.find((candidate) => candidate.value === option.value);
            return (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Ionicons
                  color={active ? colors.volt : colors.textMuted}
                  name={(active ? item?.iconActive : item?.icon) ?? 'ellipse-outline'}
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
          value={tab}
        />
      </View>

      {pending ? (
        <Grid testID="music-loading">
          {[0, 1, 2, 3].map((key) => (
            <PlaylistCardSkeleton key={key} width={cardWidth} />
          ))}
        </Grid>
      ) : failed && items.length === 0 ? (
        <ErrorState
          error={publicList.error ?? privateList.error}
          onRetry={() => void Promise.all([publicList.refetch(), privateList.refetch()])}
        />
      ) : items.length === 0 ? (
        <EmptyState icon="musical-notes-outline" message={EMPTY[tab].message} title={EMPTY[tab].title}>
          <Button icon="add" label="Añadir música" onPress={() => setAdding(true)} variant="secondary" />
        </EmptyState>
      ) : (
        <View style={{ gap: spacing.lg }}>
          <Text tone="muted" variant="subhead">
            {items.length === 1 ? '1 playlist' : `${items.length} playlists`}
            {hasMore ? ' · hay más' : ''}
          </Text>
          <Grid testID={`music-list-${tab}`}>
            {items.map((playlist, index) => (
              <EnterUp index={index} key={playlist.id}>
                <PlaylistCard onManage={() => setManaging(playlist)} playlist={playlist} width={cardWidth} />
              </EnterUp>
            ))}
          </Grid>
          {hasMore ? (
            <Button
              label="Ver más"
              loading={publicList.isFetchingNextPage || privateList.isFetchingNextPage}
              onPress={() => void loadMore()}
              variant="ghost"
            />
          ) : null}
        </View>
      )}

      <AddPlaylistSheet initialVisibility="PUBLIC" onClose={() => setAdding(false)} visible={adding} />
      <ManageSheet onClose={() => setManaging(null)} playlist={managing} />
    </ScrollScreen>
  );
}

function Grid({ children, testID }: { children: React.ReactNode; testID?: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, rowGap: spacing.xl }} testID={testID}>
      {children}
    </View>
  );
}

/** Lo que puedes hacer con una playlist tuya: abrirla, cambiar quién la ve o quitarla. */
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
          icon={toPublic ? 'people-outline' : 'lock-closed-outline'}
          label={toPublic ? 'Compartir con la comunidad' : 'Que solo la vea yo'}
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
