import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useEffect, useMemo, useRef } from 'react';
import { AppState, Linking } from 'react-native';
import { create } from 'zustand';
import { summariseTraining } from '@gymsheet/domain';
import { chatService, programService, routineService, workoutService } from '@/api/services';
import { activeProgramsKey } from '@/features/programs/use-active-programs';
import { colors } from '@/theme';
import { gymInput, matchInput } from './nudge-input';
import { gymTimeline, matchTimeline, planNotifications } from './nudge';
import { useNudgePrefs } from './nudge-prefs';
import { scheduleNudges } from './notifications';
import { currentEntry, storeEntries, type NudgeSnapshot, type StoredEntry, type WidgetPalette } from './snapshot';
import { publishWidgets } from './widgets';

export const pendingRepliesKey = ['chat', 'pending-replies'] as const;

/** Lo que Repi dice ahora mismo: lo lee la tarjeta de Inicio. */
export const useRepiNow = create<{ gym: StoredEntry | null; matches: StoredEntry | null }>(() => ({ gym: null, matches: null }));

function palette(): WidgetPalette {
  return { background: colors.background, text: colors.text, muted: colors.textSecondary };
}

/** Lo que queda en el widget al cerrar sesión: nada personal. */
function signedOutSnapshot(): NudgeSnapshot {
  const entry = {
    at: Date.now(),
    mood: 'wink' as const,
    title: 'Repi te espera',
    body: 'Inicia sesión y te digo qué toca hoy.',
    bodyPrivate: 'Inicia sesión y te digo qué toca hoy.',
    url: 'gymsheet:///',
  };
  return { version: 1, palette: palette(), gym: [entry], matches: [{ ...entry, mood: 'flirty' }] };
}

/**
 * Mantiene al día los widgets, la tarjeta de Inicio y las notificaciones de
 * Repi. Se monta solo con sesión abierta (en `app/(app)/_layout.tsx`): al
 * cerrarla se desmonta y deja los widgets sin datos personales.
 *
 * Lee las mismas consultas que Inicio (misma clave, misma caché), así que no
 * añade peticiones cuando Inicio ya las hizo. Al terminar un entreno la sesión
 * invalida `['workouts']`, esto se recalcula y Repi pasa a orgullosa.
 */
export function NudgeSync() {
  const queryClient = useQueryClient();
  const { showMatchNames, notifications, hydrated, hydrate } = useNudgePrefs();
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const workouts = useQuery({ queryKey: ['workouts', 'recent'], queryFn: () => workoutService.list(40) });
  const programs = useQuery({ queryKey: activeProgramsKey, queryFn: () => programService.active(), staleTime: 30_000 });
  const routineId = programs.data?.fuerza?.rutinaId;
  const routine = useQuery({
    queryKey: ['routine', routineId],
    queryFn: () => routineService.get(routineId ?? ''),
    enabled: Boolean(routineId),
  });
  const pending = useQuery({ queryKey: pendingRepliesKey, queryFn: chatService.pendingReplies, staleTime: 60_000 });

  // Al volver a la app, los matches pueden haber cambiado sin que nada lo invalide.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void queryClient.invalidateQueries({ queryKey: pendingRepliesKey });
    });
    return () => subscription.remove();
  }, [queryClient]);

  // Tocar una notificación de Repi lleva a donde dice.
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { source?: unknown; url?: unknown } | undefined;
      if (data?.source === 'repi' && typeof data.url === 'string') void Linking.openURL(data.url);
    });
    return () => subscription.remove();
  }, []);

  const ready = workouts.isSuccess && !programs.isPending && (!routineId || !routine.isPending) && hydrated;
  const inputs = useMemo(() => {
    if (!ready) return null;
    const now = new Date();
    const sessions = workouts.data?.items ?? [];
    return {
      gym: gymInput(now, sessions, routine.data?.dias ?? null, summariseTraining(sessions, now).streakWeeks),
      matches: matchInput(now, pending.data ?? null, showMatchNames),
    };
  }, [ready, workouts.data, routine.data, pending.data, showMatchNames]);

  const lastPublished = useRef<string | null>(null);
  useEffect(() => {
    if (!inputs) return;
    const snapshot: NudgeSnapshot = {
      version: 1,
      palette: palette(),
      gym: storeEntries(gymTimeline(inputs.gym)),
      matches: storeEntries(matchTimeline(inputs.matches)),
    };
    // Mismo contenido (sin las fechas, que cambian en cada cálculo): no se recarga el widget.
    useRepiNow.setState({ gym: currentEntry(snapshot.gym, Date.now()), matches: currentEntry(snapshot.matches, Date.now()) });
    const key = JSON.stringify([snapshot.gym.map(({ at: _at, ...rest }) => rest), snapshot.matches.map(({ at: _at, ...rest }) => rest), notifications]);
    if (key === lastPublished.current) return;
    lastPublished.current = key;
    void publishWidgets(snapshot);
    void scheduleNudges(planNotifications(inputs.gym, inputs.matches), notifications);
  }, [inputs, notifications]);

  useEffect(
    () => () => {
      useRepiNow.setState({ gym: null, matches: null });
      void publishWidgets(signedOutSnapshot());
      void scheduleNudges([], false);
    },
    [],
  );

  return null;
}
