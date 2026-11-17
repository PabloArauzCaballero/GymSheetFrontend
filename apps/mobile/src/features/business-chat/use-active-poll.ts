import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * A polling interval that runs only while the app is in the foreground and
 * this screen is focused (React Query on React Native has no notion of
 * either). Coming back calls `onResume`, so nothing waits for the next tick.
 */
export function useActivePoll(intervalMs: number, onResume: () => void): number | false {
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && previous !== 'active') onResume();
      previous = state;
      setForeground(state === 'active');
    });
    return () => subscription.remove();
  }, [onResume]);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      onResume();
      return () => setFocused(false);
    }, [onResume]),
  );
  return foreground && focused ? intervalMs : false;
}
