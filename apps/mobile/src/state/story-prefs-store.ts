import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const KEY = 'gymsheet.storyPrefs';

export type StoryAudienceMode = 'ALL_CONNECTIONS' | 'SELECTED_CONNECTIONS';

/**
 * Ajustes de publicación de stories, recordados entre sesiones: con ellos, el
 * toque en «Tu historia» abre la cámara sin pasar por una hoja de opciones.
 * Las personas elegidas no se recuerdan (cambian con las conexiones).
 */
type StoryPrefs = {
  audienceMode: StoryAudienceMode;
  /** Abrir la vista previa (texto) antes de publicar. Apagado: publica al aceptar la foto. */
  reviewBeforePublish: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  set: (patch: Partial<Pick<StoryPrefs, 'audienceMode' | 'reviewBeforePublish'>>) => void;
};

export const useStoryPrefs = create<StoryPrefs>((set, get) => ({
  audienceMode: 'ALL_CONNECTIONS',
  reviewBeforePublish: false,
  hydrated: false,
  async hydrate() {
    if (get().hydrated) return;
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoryPrefs>;
        set({
          audienceMode: parsed.audienceMode === 'SELECTED_CONNECTIONS' ? 'SELECTED_CONNECTIONS' : 'ALL_CONNECTIONS',
          reviewBeforePublish: parsed.reviewBeforePublish === true,
        });
      }
    } catch {
      // Sin ajustes guardados se usan los de fábrica.
    }
    set({ hydrated: true });
  },
  set(patch) {
    set(patch);
    const { audienceMode, reviewBeforePublish } = get();
    void SecureStore.setItemAsync(KEY, JSON.stringify({ audienceMode, reviewBeforePublish })).catch(() => undefined);
  },
}));
