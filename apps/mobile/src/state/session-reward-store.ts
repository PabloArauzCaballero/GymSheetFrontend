import type { SessionReward } from '@gymsheet/schemas';
import { create } from 'zustand';

/**
 * La sesión recién cerrada y lo que movió en la senda, de camino a la pantalla
 * «Sesión terminada».
 *
 * Va en memoria y no como parámetro de ruta: la recompensa trae insignias
 * completas y serializarlas en la URL sería frágil. Si la app se reinicia en esa
 * pantalla, el resumen se pierde pero los puntos no: ya están en la senda.
 */
export interface FinishedSession {
  sessionId: string;
  /** Nula si la sesión no tiene hora de cierre. */
  duration: string | null;
  sets: number;
  volumeKg: number;
  geoVerified: boolean;
  reward: SessionReward;
}

interface SessionRewardState {
  last: FinishedSession | null;
  setLast: (session: FinishedSession) => void;
  clear: () => void;
}

export const useSessionRewardStore = create<SessionRewardState>((set) => ({
  last: null,
  setLast: (last) => set({ last }),
  clear: () => set({ last: null }),
}));
