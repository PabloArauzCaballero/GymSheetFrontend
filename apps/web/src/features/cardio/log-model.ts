import type { CardioSetInput } from '@gymsheet/types';

export type CardioLogDraft = {
  minutos: string;
  distanciaKm: string;
  fcMedia: string;
  rpe: string;
};

export type CardioLogErrors = Partial<Record<keyof CardioLogDraft, string>>;

const num = (value: string): number | null => {
  const parsed = Number(value.replace(',', '.'));
  return value.trim() !== '' && Number.isFinite(parsed) ? parsed : null;
};

export function validateLog(draft: CardioLogDraft): CardioLogErrors {
  const errors: CardioLogErrors = {};
  const minutes = num(draft.minutos);
  if (minutes === null || minutes <= 0 || minutes > 1440) errors.minutos = 'Anota cuántos minutos duró.';
  if (draft.distanciaKm.trim() !== '') {
    const km = num(draft.distanciaKm);
    if (km === null || km < 0 || km > 500) errors.distanciaKm = 'La distancia va de 0 a 500 km.';
  }
  if (draft.fcMedia.trim() !== '') {
    const bpm = num(draft.fcMedia);
    if (bpm === null || bpm < 30 || bpm > 230) errors.fcMedia = 'El pulso medio va de 30 a 230 lpm.';
  }
  if (draft.rpe.trim() !== '') {
    const rpe = num(draft.rpe);
    if (rpe === null || !Number.isInteger(rpe) || rpe < 1 || rpe > 10) errors.rpe = 'El esfuerzo va de 1 a 10.';
  }
  return errors;
}

/** `tipoSerie: 'CARDIO'` con duración en segundos y distancia en metros; lo demás solo si se anotó. */
export function toCardioSet(draft: CardioLogDraft): CardioSetInput {
  const minutes = num(draft.minutos) ?? 0;
  const km = draft.distanciaKm.trim() === '' ? null : num(draft.distanciaKm);
  const bpm = draft.fcMedia.trim() === '' ? null : num(draft.fcMedia);
  const rpe = draft.rpe.trim() === '' ? null : num(draft.rpe);
  return {
    tipoSerie: 'CARDIO',
    numeroSerie: 1,
    duracionSeg: Math.max(1, Math.round(minutes * 60)),
    ...(km !== null ? { distanciaM: Math.round(km * 1000) } : {}),
    ...(bpm !== null ? { fcMedia: Math.round(bpm) } : {}),
    ...(rpe !== null ? { rpe } : {}),
    descansoSegAnterior: 0,
  };
}

/** 125 s → «02:05»; con horas, «1:02:05». */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
