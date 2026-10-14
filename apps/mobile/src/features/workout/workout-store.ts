import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';
import type { Exercise } from '@gymsheet/types';
import { cancelRestEnd, scheduleRestEnd } from './rest-notification';

/** Presets de la hoja de descanso (C8.3.3, anti-patrón «solo de 15 en 15»). */
export const REST_PRESETS = [60, 90, 120, 180] as const;
/** Lo que suma o resta cada toque de −15/+15. */
export const REST_STEP_SEC = 15;
/** Cuánto se queda a la vista el «Descanso terminado» antes de irse solo. */
const FINISHED_LINGER_MS = 4000;

/** La sesión abierta, para la mini-barra de encima de las pestañas. */
export type ActiveWorkout = {
  id: string;
  /** El ejercicio que toca ahora («Press banca»). */
  current: string | null;
  /** «Vuelta 2/3» o «2/4». */
  progress: string | null;
};

export type RestKind = 'set' | 'between' | 'round' | 'none';

/** Lo que viene después del descanso, ya partido para pintarlo sin cortes de línea raros. */
export type RestNext = {
  /** «Remo con barra». */
  name: string;
  /** «Serie 2» o «Vuelta 2/3». */
  step: string;
  /** «70 kg × 7», «0:45», o `null`. */
  load: string | null;
  /** Qué es `load`: una carga o un tiempo (cambia su color y su glifo). */
  loadKind: 'weight' | 'time';
  exercise: Pick<Exercise, 'media' | 'nombre' | 'grupoMuscular' | 'imagenUrl'> | null;
  /** El ejercicio cuyo descanso es este (para «Cambiar descanso»). */
  restOwnerId: string | null;
  /** «Press de banca completo»: lo que se acaba de cerrar con la serie anterior, o `null`. */
  finished: string | null;
};

type WorkoutState = {
  active: ActiveWorkout | null;
  /** Fin del descanso en curso (marca de tiempo) o `null`. */
  restEndsAt: number | null;
  restTotalMs: number;
  /** «Siguiente: Remo · serie 2». */
  restNext: string | null;
  /** Lo mismo, estructurado, para la pantalla de descanso. */
  restNextDetail: RestNext | null;
  /** Instante en que terminó el último descanso (para el «¡Listo!» de unos segundos). */
  restFinishedAt: number | null;
  restSessionId: string | null;
  /** Qué clase de pausa es: entre series, transición de una superserie o tras la vuelta. */
  restKind: RestKind;
  setActive: (active: ActiveWorkout | null) => void;
  startRest: (sessionId: string, seconds: number, next: string | null, kind?: RestKind, detail?: RestNext | null) => void;
  /** Cambia la duración total del descanso en curso (hoja «Cambiar descanso»); conserva lo ya descansado. */
  retimeRest: (totalSeconds: number) => void;
  adjustRest: (deltaSec: number) => void;
  setRestPreset: (seconds: number) => void;
  skipRest: () => void;
  /** Al cerrar o cancelar la sesión: sin descanso ni mini-barra. */
  endSession: (sessionId: string) => void;
};

let timer: ReturnType<typeof setTimeout> | null = null;
let lingerTimer: ReturnType<typeof setTimeout> | null = null;
let notificationId: string | null = null;

function clearTimers() {
  if (timer) clearTimeout(timer);
  if (lingerTimer) clearTimeout(lingerTimer);
  timer = null;
  lingerTimer = null;
  cancelRestEnd(notificationId);
  notificationId = null;
}

/**
 * Estado del entrenamiento que sobrevive a salir de la pantalla: el descanso
 * vive aquí (por fecha de fin, no restando segundos) para que la mini-barra
 * de las pestañas y la pantalla del entreno cuenten lo mismo, el háptico de
 * éxito suene una sola vez y la notificación local se reprograme al ajustar.
 */
export const useWorkoutStore = create<WorkoutState>((set, get) => {
  /** Programa el fin (temporizador en primer plano + notificación local). */
  const arm = (endsAt: number) => {
    clearTimers();
    const ms = Math.max(0, endsAt - Date.now());
    timer = setTimeout(() => {
      timer = null;
      notificationId = null;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      set({ restEndsAt: null, restFinishedAt: Date.now() });
      lingerTimer = setTimeout(() => set({ restFinishedAt: null }), FINISHED_LINGER_MS);
    }, ms);
    const next = get().restNext;
    void scheduleRestEnd(ms / 1000, next ? `Siguiente: ${next}` : 'A por la siguiente serie.').then((id) => {
      // Si el descanso cambió mientras se pedía el permiso, esta ya no vale.
      if (get().restEndsAt === endsAt) notificationId = id;
      else cancelRestEnd(id);
    });
  };

  return {
    active: null,
    restEndsAt: null,
    restTotalMs: 0,
    restNext: null,
    restNextDetail: null,
    restFinishedAt: null,
    restSessionId: null,
    restKind: 'set',
    setActive: (active) => set({ active }),
    startRest: (sessionId, seconds, next, kind = 'set', detail = null) => {
      if (seconds <= 0) {
        clearTimers();
        set({ restEndsAt: null, restFinishedAt: null, restNext: next, restNextDetail: detail, restSessionId: sessionId, restKind: 'none' });
        return;
      }
      const endsAt = Date.now() + seconds * 1000;
      set({
        restEndsAt: endsAt,
        restTotalMs: seconds * 1000,
        restNext: next,
        restNextDetail: detail,
        restFinishedAt: null,
        restSessionId: sessionId,
        restKind: kind,
      });
      arm(endsAt);
    },
    retimeRest: (totalSeconds) => {
      const { restEndsAt, restTotalMs } = get();
      if (restEndsAt === null) return;
      const startedAt = restEndsAt - restTotalMs;
      const totalMs = Math.max(1000, totalSeconds * 1000);
      // Si ya se descansó más que el nuevo total, queda un segundo: se cierra solo.
      const endsAt = Math.max(Date.now() + 1000, startedAt + totalMs);
      set({ restEndsAt: endsAt, restTotalMs: totalMs });
      arm(endsAt);
    },
    adjustRest: (deltaSec) => {
      const { restEndsAt, restTotalMs } = get();
      if (restEndsAt === null) return;
      const endsAt = Math.max(Date.now() + 1000, restEndsAt + deltaSec * 1000);
      // El total se mueve con el ajuste para que el anillo siga diciendo cuánto queda.
      set({ restEndsAt: endsAt, restTotalMs: Math.max(1000, restTotalMs + deltaSec * 1000) });
      arm(endsAt);
    },
    setRestPreset: (seconds) => {
      const endsAt = Date.now() + seconds * 1000;
      set({ restEndsAt: endsAt, restTotalMs: seconds * 1000, restFinishedAt: null });
      arm(endsAt);
    },
    skipRest: () => {
      clearTimers();
      set({ restEndsAt: null, restFinishedAt: null });
    },
    endSession: (sessionId) => {
      if (get().restSessionId === sessionId || get().active?.id === sessionId) {
        clearTimers();
        set({ restEndsAt: null, restFinishedAt: null, restSessionId: null, active: null });
      }
    },
  };
});

/**
 * Al volver a primer plano: en segundo plano (o con la pantalla bloqueada) iOS
 * congela los temporizadores de JS, así que el `setTimeout` del fin puede
 * haberse quedado dormido. El descanso se guarda por fecha de fin, no restando
 * segundos: basta mirar el reloj. Si ya pasó, se cierra ahora (sin háptico: el
 * aviso ya lo dio la notificación local); si no, se rearma por lo que queda.
 */
function resyncRest() {
  const { restEndsAt } = useWorkoutStore.getState();
  if (restEndsAt === null) return;
  if (timer) clearTimeout(timer);
  timer = null;
  const ms = restEndsAt - Date.now();
  if (ms <= 0) {
    cancelRestEnd(notificationId);
    notificationId = null;
    useWorkoutStore.setState({ restEndsAt: null, restFinishedAt: Date.now() });
    if (lingerTimer) clearTimeout(lingerTimer);
    lingerTimer = setTimeout(() => useWorkoutStore.setState({ restFinishedAt: null }), FINISHED_LINGER_MS);
    return;
  }
  timer = setTimeout(() => {
    timer = null;
    notificationId = null;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    useWorkoutStore.setState({ restEndsAt: null, restFinishedAt: Date.now() });
    lingerTimer = setTimeout(() => useWorkoutStore.setState({ restFinishedAt: null }), FINISHED_LINGER_MS);
  }, ms);
}

AppState.addEventListener('change', (status) => {
  if (status === 'active') resyncRest();
});

/** Cambia cada vez que la app vuelve a primer plano: lo que anima por reloj se rearma. */
export function useForegroundTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') setTick((value) => value + 1);
    });
    return () => subscription.remove();
  }, []);
  return tick;
}

/** Milisegundos que quedan del descanso, refrescados 4 veces por segundo mientras corre. */
export function useRestRemaining(): { remainingMs: number; totalMs: number; running: boolean; finished: boolean } {
  const endsAt = useWorkoutStore((state) => state.restEndsAt);
  const totalMs = useWorkoutStore((state) => state.restTotalMs);
  const finishedAt = useWorkoutStore((state) => state.restFinishedAt);
  const [now, setNow] = useState(() => Date.now());
  const foreground = useForegroundTick();
  useEffect(() => {
    if (endsAt === null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt, foreground]);
  const remainingMs = endsAt === null ? 0 : Math.max(0, endsAt - now);
  return { remainingMs, totalMs, running: endsAt !== null, finished: finishedAt !== null };
}

/** `M:SS`, redondeado hacia arriba: el último segundo visible es un segundo entero. */
export function formatRestClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Para lectores de pantalla: «Quedan 1 minuto y 20 segundos». */
export function speakRest(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes === 0) return `Quedan ${seconds} segundos de descanso`;
  return `Quedan ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} y ${seconds} segundos de descanso`;
}
