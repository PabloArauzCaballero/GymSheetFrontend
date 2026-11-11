import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { useAuthStore } from '@/state/auth-store';

const ENABLED_KEY = 'gymsheet.biometricLock';

/** Less than this in the background (a message, a song change) does not lock. */
export const BACKGROUND_GRACE_MS = 2 * 60_000;

interface AppLockState {
  /** The member turned on «Desbloquear con Face ID / huella» on this phone. */
  enabled: boolean;
  /** The app is covered by the unlock screen. */
  locked: boolean;
  /** The system prompt is open: its own focus change must not count as leaving. */
  prompting: boolean;
  load: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
  lockIfEnabled: () => void;
  unlock: () => void;
  setPrompting: (prompting: boolean) => void;
}

/**
 * Locks the app behind Face ID / fingerprint when the member turned it on.
 *
 * The session now lasts months, so what keeps someone else out of an unlocked
 * phone left on a bench is this, not the login. The API is still the authority:
 * this protects the phone, not the account.
 */
export const useAppLockStore = create<AppLockState>((set, get) => ({
  enabled: false,
  locked: false,
  prompting: false,

  async load() {
    try {
      set({ enabled: (await SecureStore.getItemAsync(ENABLED_KEY)) === 'true' });
    } catch {
      set({ enabled: false });
    }
  },

  async setEnabled(enabled) {
    await SecureStore.setItemAsync(ENABLED_KEY, String(enabled));
    set({ enabled, locked: enabled ? get().locked : false });
  },

  lockIfEnabled() {
    if (get().enabled) set({ locked: true });
  },

  unlock() {
    set({ locked: false });
  },

  setPrompting(prompting) {
    set({ prompting });
  },
}));

/**
 * Wires the lock to the app's life: lock when a saved session is restored on
 * a cold start and when returning after [BACKGROUND_GRACE_MS]; never right
 * after typing the password (the member just proved who they are).
 */
export function useAppLockLifecycle(): void {
  const status = useAuthStore((state) => state.status);
  const previousStatus = useRef(status);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    void useAppLockStore.getState().load();
  }, []);

  useEffect(() => {
    const previous = previousStatus.current;
    previousStatus.current = status;
    const lock = useAppLockStore.getState();
    if (status === 'unauthenticated') {
      lock.unlock();
      return;
    }
    // loading → authenticated is the restore on a cold start; a login comes
    // from 'unauthenticated' and does not lock.
    if (status === 'authenticated' && previous === 'loading') {
      void lock.load().then(() => useAppLockStore.getState().lockIfEnabled());
    }
  }, [status]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      const lock = useAppLockStore.getState();
      if (lock.prompting) return;
      if (next === 'background') {
        backgroundedAt.current ??= Date.now();
        return;
      }
      if (next !== 'active') return;
      const since = backgroundedAt.current;
      backgroundedAt.current = null;
      if (
        since !== null &&
        Date.now() - since >= BACKGROUND_GRACE_MS &&
        useAuthStore.getState().status === 'authenticated'
      ) {
        lock.lockIfEnabled();
      }
    });
    return () => subscription.remove();
  }, []);
}
