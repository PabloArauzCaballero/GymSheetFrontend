import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
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

type WorkoutState = {
  active: ActiveWorkout | null;
  /** Fin del descanso en curso (marca de tiempo) o `null`. */
  restEndsAt: number | null;
  restTotalMs: number;
  /** «Siguiente: Remo · serie 2». */
  restNext: string | null;
  /** Instante en que terminó el último descanso (para el «¡Listo!» de unos segundos). */
  restFinishedAt: number | null;
  restSessionId: string | null;
  setActive: (active: ActiveWorkout | null) => void;
  startRest: (sessionId: string, seconds: number, next: string | null) => void;
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
    restFinishedAt: null,
    restSessionId: null,
    setActive: (active) => set({ active }),
    startRest: (sessionId, seconds, next) => {
      if (seconds <= 0) {
        clearTimers();
        set({ restEndsAt: null, restFinishedAt: null, restNext: next, restSessionId: sessionId });
        return;
      }
      const endsAt = Date.now() + seconds * 1000;
      set({ restEndsAt: endsAt, restTotalMs: seconds * 1000, restNext: next, restFinishedAt: null, restSessionId: sessionId });
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

/** Milisegundos que quedan del descanso, refrescados 4 veces por segundo mientras corre. */
export function useRestRemaining(): { remainingMs: number; totalMs: number; running: boolean; finished: boolean } {
  const endsAt = useWorkoutStore((state) => state.restEndsAt);
  const totalMs = useWorkoutStore((state) => state.restTotalMs);
  const finishedAt = useWorkoutStore((state) => state.restFinishedAt);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endsAt === null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt]);
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
