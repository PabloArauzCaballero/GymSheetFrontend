import { z } from 'zod';

/**
 * Música para entrenar: playlists de la comunidad que son SOLO un enlace a
 * Spotify. No se reproduce nada en la app; tocar abre Spotify. «Pública» la ve
 * toda la comunidad; «Privada», solo quien la guardó.
 */
export const musicVisibilities = ['PUBLIC', 'PRIVATE'] as const;
export const musicPlaylistKinds = ['playlist', 'album', 'track', 'artist', 'show'] as const;

export const musicPlaylistSchema = z.object({
  id: z.string(),
  url: z.string(),
  tipo: z.enum(musicPlaylistKinds),
  titulo: z.string(),
  imagenUrl: z.string().nullable(),
  visibilidad: z.enum(musicVisibilities),
  esMia: z.boolean(),
  creadaEn: z.string(),
  autor: z.object({
    id: z.string(),
    displayName: z.string(),
    avatarUrl: z.string().nullable(),
  }),
});

export const musicPlaylistPageSchema = z.object({
  items: z.array(musicPlaylistSchema),
  nextCursor: z.string().nullable(),
});

/** Lo que acepta el formulario antes de llamar al servidor (el servidor decide al final). */
export const SPOTIFY_URL_PATTERN =
  /^https:\/\/(open\.spotify\.com\/(intl-[a-z]{2}(-[a-z]{2})?\/)?(playlist|album|track|artist|show)\/[A-Za-z0-9]+|spotify\.link\/[A-Za-z0-9]+)/;

export type MusicVisibility = (typeof musicVisibilities)[number];
export type MusicPlaylist = z.infer<typeof musicPlaylistSchema>;
export type MusicPlaylistPage = z.infer<typeof musicPlaylistPageSchema>;
