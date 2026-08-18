import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

/**
 * Whether the guided tour has been seen, and whether it is on screen now.
 *
 * The "seen" flag is persisted rather than kept in memory: a tour that replays
 * on every cold start stops being an introduction and becomes an obstacle. It
 * lives in SecureStore because that is the storage this app already ships with;
 * nothing here is sensitive, it is simply the one persistent store available.
 */
const SEEN_KEY = 'gymsheet.tour.seen.v1';

interface TourState {
  /** `null` until the persisted flag has been read. */
  seen: boolean | null;
  visible: boolean;
  hydrate: () => Promise<void>;
  open: () => void;
  /** Closes and remembers, so it never reappears unasked. */
  complete: () => Promise<void>;
}

export const useTourStore = create<TourState>((set) => ({
  seen: null,
  visible: false,
  hydrate: async () => {
    try {
      const stored = await SecureStore.getItemAsync(SEEN_KEY);
      const seen = stored === 'true';
      // Opening here rather than from a screen keeps the decision in one place:
      // the tour shows exactly once, on the first run that reaches the app.
      set({ seen, visible: !seen });
    } catch {
      // A storage failure must not block the app; treat it as already seen so
      // the user is never trapped behind a tour that cannot remember itself.
      set({ seen: true, visible: false });
    }
  },
  open: () => set({ visible: true }),
  complete: async () => {
    set({ visible: false, seen: true });
    try {
      await SecureStore.setItemAsync(SEEN_KEY, 'true');
    } catch {
      // Ignored on purpose: worst case it shows once more.
    }
  },
}));
