import { useState } from 'react';
import { View } from 'react-native';
import { SPOTIFY_URL_PATTERN, type MusicVisibility } from '@gymsheet/schemas';
import { ApiError } from '@gymsheet/api-client';
import { BottomSheet } from '@/components/bottom-sheet';
import { FilterChip } from '@/components/filter-chip';
import { Text } from '@/components/text';
import { Button, Input } from '@/components/ui';
import { notify } from '@/notifications';
import { spacing } from '@/theme';
import { useMusicMutations } from '@/features/music/use-music';

/** El servidor devuelve código y mensaje en español; lo conocido se dice mejor aquí. */
function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) return 'Ya guardaste este enlace.';
    if (error.status === 400) return 'Ese enlace no es de Spotify. Cópialo con «Compartir → Copiar enlace».';
  }
  return 'No pudimos guardarla. Inténtalo de nuevo.';
}

/**
 * Añadir música: pegas el enlace de Spotify (Compartir → Copiar enlace) y
 * eliges si la ve la comunidad o solo tú. Título y portada los trae el servidor.
 */
export function AddPlaylistSheet({
  visible,
  onClose,
  initialVisibility,
}: {
  visible: boolean;
  onClose: () => void;
  initialVisibility: MusicVisibility;
}) {
  const { create } = useMusicMutations();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<MusicVisibility>(initialVisibility);
  const [error, setError] = useState<string | undefined>();
  const [lastVisible, setLastVisible] = useState(false);
  // Cada vez que se abre arranca en la pestaña desde la que se abrió.
  if (visible !== lastVisible) {
    setLastVisible(visible);
    if (visible) {
      setVisibility(initialVisibility);
      setError(undefined);
    }
  }

  const clean = url.trim();
  const valid = SPOTIFY_URL_PATTERN.test(clean);

  const save = () => {
    if (!valid) {
      setError('Pega un enlace de Spotify (open.spotify.com o spotify.link).');
      return;
    }
    create.mutate(
      { url: clean, visibilidad: visibility, ...(title.trim() ? { titulo: title.trim() } : {}) },
      {
        onSuccess: () => {
          notify.success(visibility === 'PUBLIC' ? 'Playlist compartida con la comunidad.' : 'Playlist guardada solo para ti.');
          setUrl('');
          setTitle('');
          onClose();
        },
        onError: (failure) => setError(errorText(failure)),
      },
    );
  };

  return (
    <BottomSheet
      onClose={onClose}
      subtitle="Solo guardamos el enlace: la música se escucha en Spotify."
      testID="add-playlist-sheet"
      title="Añadir música"
      visible={visible}
    >
      <View style={{ gap: spacing.md }}>
        <Input
          autoCapitalize="none"
          autoCorrect={false}
          error={error}
          icon="link-outline"
          inputMode="url"
          label="Enlace de Spotify"
          onChangeText={(next) => {
            setUrl(next);
            setError(undefined);
          }}
          placeholder="https://open.spotify.com/playlist/…"
          testID="playlist-url"
          value={url}
        />
        <Input
          label="Nombre (opcional)"
          maxLength={120}
          onChangeText={setTitle}
          placeholder="Si lo dejas vacío, usamos el de Spotify"
          testID="playlist-title"
          value={title}
        />
        <View style={{ gap: spacing.sm }}>
          <Text tone="muted" variant="footnote">
            ¿Quién la ve?
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <FilterChip
              label="Pública · la comunidad"
              onPress={() => setVisibility('PUBLIC')}
              selected={visibility === 'PUBLIC'}
              testID="playlist-public"
            />
            <FilterChip
              label="Privada · solo tú"
              onPress={() => setVisibility('PRIVATE')}
              selected={visibility === 'PRIVATE'}
              testID="playlist-private"
            />
          </View>
        </View>
        <Button
          disabled={clean.length === 0}
          icon="musical-notes"
          label="Guardar"
          loading={create.isPending}
          onPress={save}
          testID="playlist-save"
        />
      </View>
    </BottomSheet>
  );
}
