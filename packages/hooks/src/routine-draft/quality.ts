import {
  WEEKDAYS,
  WEEKDAY_NAMES,
  ZONES_WITHOUT_FREQUENCY_WARNING,
  durationInWeeks,
  totalSets,
  type RoutineDraft,
  type WeekChoice,
  type Weekday,
} from './model';

/** Más series que esto en un día es un aviso (03 · RF-08). */
export const MAX_SETS_PER_DAY = 30;

export type QualityIssue = {
  codigo: 'DIA_VACIO' | 'MUCHAS_SERIES' | 'FRECUENCIA_BAJA';
  mensaje: string;
  /** Día afectado, si el aviso es de un día. */
  dia?: Weekday;
};

export type QualityReport = {
  /** Impiden guardar (`ROUTINE_HAS_NO_DAYS` en el servidor). */
  bloqueos: QualityIssue[];
  /** Orientan, no bloquean. */
  avisos: QualityIssue[];
};

/**
 * Avisos de calidad del borrador. Se calculan en el cliente porque el backend
 * todavía no expone `quality-check`; las reglas son las de 03 · RF-08:
 * - un día sin ejercicios bloquea;
 * - más de 30 series en un día avisa;
 * - un grupo muscular que sólo aparece en un día de la semana avisa (ACSM: cada
 *   grupo, al menos dos veces por semana), siempre que haya dos o más días.
 */
export function evaluateQuality(draft: RoutineDraft): QualityReport {
  const bloqueos: QualityIssue[] = [];
  const avisos: QualityIssue[] = [];

  for (const day of draft.dias) {
    const name = day.nombre.trim()
      ? `${WEEKDAY_NAMES[day.diaSemana]} · ${day.nombre.trim()}`
      : WEEKDAY_NAMES[day.diaSemana];
    if (day.ejercicios.length === 0) {
      bloqueos.push({
        codigo: 'DIA_VACIO',
        mensaje: `Hay un día sin ejercicios: ${name}`,
        dia: day.diaSemana,
      });
    } else if (totalSets(day.ejercicios) > MAX_SETS_PER_DAY) {
      avisos.push({
        codigo: 'MUCHAS_SERIES',
        mensaje: `${name} tiene más de ${MAX_SETS_PER_DAY} series`,
        dia: day.diaSemana,
      });
    }
  }

  if (draft.dias.length >= 2) {
    const daysByGroup = new Map<string, Set<Weekday>>();
    for (const day of draft.dias) {
      for (const exercise of day.ejercicios) {
        const group = exercise.grupoMuscular.trim();
        if (!group || ZONES_WITHOUT_FREQUENCY_WARNING.includes(group)) continue;
        const days = daysByGroup.get(group) ?? new Set<Weekday>();
        days.add(day.diaSemana);
        daysByGroup.set(group, days);
      }
    }
    for (const [group, days] of daysByGroup) {
      if (days.size === 1) {
        avisos.push({
          codigo: 'FRECUENCIA_BAJA',
          mensaje: `${group} solo se entrena 1 vez por semana`,
        });
      }
    }
  }

  return { bloqueos, avisos };
}

export type PlannedWeek = {
  numero: number;
  esDescarga: boolean;
  /** `true` si la persona la marcó a mano; `false` si sale de la regla general. */
  ajustada: boolean;
};

/** ¿La regla general (sin ajustes manuales) marca esta semana como descarga? */
export function isScheduledDeload(draft: RoutineDraft, numero: number): boolean {
  const every = draft.progresion.activa ? draft.progresion.descargaCada : null;
  return Boolean(every && durationInWeeks(draft.duracion) >= every && numero % every === 0);
}

/**
 * Semanas del programa tal como las genera el backend (`generateWeeks`): con
 * progresión activa y ciclo de N semanas, la semana múltiplo de N es descarga
 * (sólo si el programa dura al menos N). Un ajuste manual manda sobre la regla.
 */
export function planWeeks(draft: RoutineDraft): PlannedWeek[] {
  const total = durationInWeeks(draft.duracion);
  const weeks: PlannedWeek[] = [];
  for (let numero = 1; numero <= total; numero += 1) {
    const choice = draft.semanas[String(numero)];
    weeks.push({
      numero,
      esDescarga: choice ? choice === 'DESCARGA' : isScheduledDeload(draft, numero),
      ajustada: choice !== undefined,
    });
  }
  return weeks;
}

/**
 * Alterna una semana entre normal y descarga guardando sólo lo que se aparta de
 * la regla general: si el resultado coincide con ella, el ajuste se borra
 * (`null`).
 */
export function toggledWeekChoice(draft: RoutineDraft, numero: number): WeekChoice | null {
  const week = planWeeks(draft).find((candidate) => candidate.numero === numero);
  if (!week) return null;
  const wantsDeload = !week.esDescarga;
  if (wantsDeload === isScheduledDeload(draft, numero)) return null;
  return wantsDeload ? 'DESCARGA' : 'NORMAL';
}

export type MonthColumn = {
  dia: Weekday;
  entrena: boolean;
  nombre: string | null;
  ejercicios: number;
};

/** Los siete días de la semana con lo que se entrena en cada uno, para la vista Mes. */
export function monthColumns(draft: RoutineDraft): MonthColumn[] {
  return WEEKDAYS.map((dia) => {
    const day = draft.dias.find((candidate) => candidate.diaSemana === dia);
    return {
      dia,
      entrena: day !== undefined,
      nombre: day ? day.nombre.trim() || null : null,
      ejercicios: day ? day.ejercicios.length : 0,
    };
  });
}
