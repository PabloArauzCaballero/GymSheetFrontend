/** Modalidades del plan de cardio (RF-17). */
export const cardioModalities = [
  'CORRER',
  'CAMINAR',
  'BICI',
  'REMO',
  'ELIPTICA',
  'ESCALADORA',
  'NADAR',
  'HIIT',
  'OTRO',
] as const;
export type CardioModality = (typeof cardioModalities)[number];

export type CardioIntensity =
  | { tipo: 'ZONA_FC'; zona: number }
  | { tipo: 'RPE'; rpe: number };

export type CardioIntervals = { trabajoSeg: number; descansoSeg: number; rondas: number };

/** Lo que recibe `POST /cardio-plans` (y, dentro de `cardioPlan`, `POST /programs/cardio/activate`). */
export type CardioPlanInput = {
  nombre: string;
  modalidad: CardioModality;
  diasSemana: number[];
  minutosObjetivo: number;
  intensidad: CardioIntensity;
  intervalos?: CardioIntervals | null;
  fcReposo?: number | null;
  fcMax?: number | null;
  progresionPctSemana?: number;
};

export type CardioPlan = {
  id: string;
  nombre: string;
  modalidad: CardioModality;
  diasSemana: number[];
  minutosObjetivo: number;
  intensidad: { tipo: 'ZONA_FC' | 'RPE'; zona: number | null; rpe: number | null };
  intervalos: CardioIntervals | null;
  fcReposo: number | null;
  fcMax: number | null;
  progresionPctSemana: number;
};

export type ActivateCardioInput =
  | { cardioPlanId: string; fechaInicio?: string; duracionSemanas?: number; replace?: boolean }
  | { cardioPlan: CardioPlanInput; fechaInicio?: string; duracionSemanas?: number; replace?: boolean };

/** Serie de cardio de `POST /workouts/session-exercises/:id/sets` (`tipoSerie: 'CARDIO'`). */
export type CardioSetInput = {
  tipoSerie: 'CARDIO';
  numeroSerie: number;
  duracionSeg: number;
  distanciaM?: number;
  fcMedia?: number;
  rpe?: number;
  descansoSegAnterior?: number;
};

/** Lo que `POST /workouts/:id/finish` añade cuando la sesión tuvo cardio y hay un programa de cardio activo. */
export type CardioSessionExtras = {
  programId: string;
  semana: number | null;
  sesionCuenta: boolean;
  minutosCuentan: number;
  minutosSemana: number;
  objetivoMinutosSemana: number;
  objetivoMinutosSesion: number;
  cumpleObjetivoSesion: boolean;
  consejo: CardioAdvice;
};

/** Consejo de orden cuando el mismo día lleva pesas y cardio. */
export type CardioAdvice = {
  order: 'ANY' | 'WEIGHTS_FIRST';
  suggestModality: string | null;
  reason: string | null;
};
