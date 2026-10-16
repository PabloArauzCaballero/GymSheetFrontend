import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { MusicPlaylist, MusicVisibility } from '@gymsheet/schemas';
import { musicService } from '@/api/services';

export type MusicScope = 'public' | 'private';

export const musicKey = (scope: MusicScope) => ['music', 'playlists', scope] as const;

/** Una lista de playlists (públicas de la comunidad o las privadas tuyas), por cursor. */
export function useMusicPlaylists(scope: MusicScope, pageSize = 20) {
  const query = useInfiniteQuery({
    queryKey: [...musicKey(scope), pageSize],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => musicService.list(scope, pageParam, pageSize),
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 60_000,
  });
  const items: MusicPlaylist[] = query.data?.pages.flatMap((page) => page.items) ?? [];
  return { ...query, items };
}

/** Guardar, cambiar de visibilidad y borrar: las tres refrescan las dos pestañas. */
export function useMusicMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['music', 'playlists'] });
  const create = useMutation({
    mutationFn: (input: { url: string; visibilidad: MusicVisibility; titulo?: string }) =>
      musicService.create(input),
    onSuccess: refresh,
  });
  const setVisibility = useMutation({
    mutationFn: ({ id, visibilidad }: { id: string; visibilidad: MusicVisibility }) =>
      musicService.update(id, { visibilidad }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => musicService.remove(id),
    onSuccess: refresh,
  });
  return { create, setVisibility, remove };
}

/** Lo que dice el tipo de enlace, en una palabra. */
export const MUSIC_KIND_LABEL: Record<MusicPlaylist['tipo'], string> = {
  playlist: 'Playlist',
  album: 'Álbum',
  track: 'Canción',
  artist: 'Artista',
  show: 'Podcast',
};
