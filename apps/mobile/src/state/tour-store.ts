import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

/**
 * Which tours have been seen, which one is running, and where its targets are.
 *
 * There are two kinds of tour and they answer different questions. The welcome
 * deck says what the product *is*, once, before the user has any context to
 * hang detail on. The screen tours say what the thing under your thumb does,
 * and they only make sense while that thing is on screen — which is why they
 * are keyed per screen and fire on first arrival rather than all at once at the
 * start, when they would be five screens of instructions for an app the user
 * has not seen yet.
 *
 * Every key persists separately: finishing the welcome must not silently mark
 * every screen tour as seen, and a screen added later has to be able to
 * introduce itself to users who have been using the app for months.
 */
export type TourKey =
  | 'welcome'
  | 'home'
  | 'routines'
  | 'exercises'
  | 'workouts'
  | 'profile'
  | 'trayectoria'
  | 'comunidad'
  | 'descubrir'
  | 'interacciones'
  | 'chat'
  | 'membership'
  | 'notifications';

const STORAGE_PREFIX = 'gymsheet.tour.v2.';

/**
 * Descanso mínimo entre el cierre de un tour y la apertura del siguiente.
 *
 * Cubre la animación de salida del modal con margen. Por debajo de esto iOS
 * puede quedarse con la ventana que se va como frontal, y la pantalla de
 * detrás deja de existir para el sistema aunque se vea perfectamente.
 */
const TOUR_GRACE_MS = 1200;

/**
 * Lo que el tour necesita de la lista que tiene delante.
 *
 * Además de moverla, saber dónde estaba: el tour desplaza la pantalla para
 * traer a la vista aquello de lo que habla, y al terminar debe devolverla donde
 * la persona la había dejado. Quien no scrolleó fue ella.
 */
export interface ScreenScroller {
  scrollBy: (deltaY: number) => void;
  scrollTo: (y: number) => void;
  getOffset: () => number;
}

/** Where a highlighted element sits on screen, in window coordinates. */
export interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TourState {
  /** `null` until the persisted flags have been read. */
  seen: Partial<Record<TourKey, boolean>> | null;
  /** The tour on screen, if any. */
  active: TourKey | null;
  step: number;
  /** Measured position of each anchor, by target id. */
  targets: Record<string, TargetRect>;
  hydrate: () => Promise<void>;
  /** Opens a tour unconditionally — the «ver tutorial» path. */
  open: (key: TourKey) => void;
  /** Opens a tour only if it has never been completed. */
  /** Devuelve `false` si no llegó a abrirse, para que quien llama reintente. */
  openOnce: (key: TourKey) => boolean;
  setStep: (step: number) => void;
  /** Closes and remembers, so it never reappears unasked. */
  complete: () => Promise<void>;
  measure: (id: string, rect: TargetRect) => void;
  forget: (id: string) => void;
  /**
   * How to scroll the screen currently on top. Registered by `ScrollScreen`,
   * because a spotlight on something below the fold points at nothing: the
   * tour has to be able to bring its own subject into view before drawing the
   * hole around it.
   */
  scroller: ScreenScroller | null;
  registerScroller: (scroll: ScreenScroller | null) => void;
  /**
   * Bumped whenever every anchor should read its position again — after the
   * tour scrolls one into view, for instance. `onLayout` does not fire on
   * scroll, so without this the ring would stay where the element used to be,
   * which is worse than not scrolling at all.
   */
  nonce: number;
  remeasure: () => void;
  /** Posición de la lista al abrirse el tour, para restaurarla al cerrarlo. */
  restoreOffset: number | null;
  rememberOffset: () => void;
  /**
   * Cuándo se cerró el último tour.
   *
   * Existe para no presentar un modal en el instante en que otro se está
   * cerrando. En iOS eso deja la ventana saliente como frontal en el árbol de
   * accesibilidad —la pantalla se ve bien, pero para el sistema no hay nada
   * debajo—, y para la persona es peor todavía: termina la bienvenida y le cae
   * encima otra tarjeta sin respirar.
   */
  closedAt: number | null;
  /** Clears every flag so the whole tutorial can be replayed. */
  reset: () => Promise<void>;
}

const ALL_KEYS: readonly TourKey[] = [
  'welcome',
  'home',
  'routines',
  'exercises',
  'workouts',
  'profile',
  'trayectoria',
  'comunidad',
  'descubrir',
  'interacciones',
  'chat',
  'membership',
  'notifications',
];

export const useTourStore = create<TourState>((set, get) => ({
  seen: null,
  active: null,
  step: 0,
  targets: {},
  scroller: null,
  nonce: 0,
  closedAt: null,
  restoreOffset: null,
  hydrate: async () => {
    try {
      const entries = await Promise.all(
        ALL_KEYS.map(async (key) => {
          const stored = await SecureStore.getItemAsync(`${STORAGE_PREFIX}${key}`);
          return [key, stored === 'true'] as const;
        }),
      );
      const seen = Object.fromEntries(entries) as Partial<Record<TourKey, boolean>>;
      // The welcome deck opens from here rather than from a screen: the
      // decision belongs in one place, and mounting it in a screen would replay
      // it every time that screen remounts.
      set({ seen, active: seen.welcome ? null : 'welcome', step: 0 });
    } catch {
      // A storage failure must not block the app; treat everything as already
      // seen so the user is never trapped behind a tour that cannot remember
      // itself.
      set({ seen: Object.fromEntries(ALL_KEYS.map((key) => [key, true])), active: null });
    }
  },
  open: (key) => set({ active: key, step: 0 }),
  openOnce: (key) => {
    const state = get();
    // `seen === null` means the flags have not been read yet. Opening now would
    // race hydration and could show a tour the user already dismissed.
    if (state.seen === null || state.active !== null || state.seen[key]) return false;
    if (state.closedAt !== null && Date.now() - state.closedAt < TOUR_GRACE_MS) return false;
    set({ active: key, step: 0 });
    return true;
  },
  setStep: (step) => set({ step }),
  complete: async () => {
    const key = get().active;
    // Devolver la lista a donde estaba antes del tour.
    const { scroller, restoreOffset } = get();
    if (scroller && restoreOffset !== null) scroller.scrollTo(restoreOffset);
    set({ restoreOffset: null });
    set({ active: null, step: 0, closedAt: Date.now() });
    if (!key) return;
    set((state) => ({ seen: { ...(state.seen ?? {}), [key]: true } }));
    try {
      await SecureStore.setItemAsync(`${STORAGE_PREFIX}${key}`, 'true');
    } catch {
      // Ignored on purpose: worst case it shows once more.
    }
  },
  measure: (id, rect) =>
    set((state) => {
      const current = state.targets[id];
      // Layout fires often — scrolling, keyboard, rotation — and writing an
      // identical rect back would rerender the overlay on every frame.
      if (
        current &&
        current.x === rect.x &&
        current.y === rect.y &&
        current.width === rect.width &&
        current.height === rect.height
      ) {
        return state;
      }
      return { targets: { ...state.targets, [id]: rect } };
    }),
  forget: (id) =>
    set((state) => {
      if (!(id in state.targets)) return state;
      const next = { ...state.targets };
      delete next[id];
      return { targets: next };
    }),
  registerScroller: (scroll) => set({ scroller: scroll }),
  remeasure: () => set((state) => ({ nonce: state.nonce + 1 })),
  rememberOffset: () =>
    set((state) =>
      state.restoreOffset === null && state.scroller
        ? { restoreOffset: state.scroller.getOffset() }
        : state,
    ),
  reset: async () => {
    set({ seen: Object.fromEntries(ALL_KEYS.map((key) => [key, false])), active: 'welcome', step: 0 });
    try {
      await Promise.all(
        ALL_KEYS.map((key) => SecureStore.deleteItemAsync(`${STORAGE_PREFIX}${key}`)),
      );
    } catch {
      // Ignored: the in-memory flags above already replay the tutorial now.
    }
  },
}));
