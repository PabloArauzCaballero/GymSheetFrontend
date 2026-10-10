import type { Routine } from '@gymsheet/types';
import { WEEKDAY_NAMES, type Weekday } from '../routine-draft/model';
import { setsLabel } from './calendar-view';

export type VersionChange = {
  tipo: 'DIA_NUEVO' | 'DIA_QUITADO' | 'EJERCICIO_NUEVO' | 'EJERCICIO_QUITADO' | 'EJERCICIO_CAMBIADO';
  texto: string;
};

type Day = Routine['dias'][number];

const dayName = (day: Day): string =>
  day.diaSemana ? WEEKDAY_NAMES[day.diaSemana as Weekday] : (day.nombre ?? 'Cualquier día');

const dayKey = (day: Day, index: number): string =>
  day.diaSemana === null ? `idx-${index}` : `d-${day.diaSemana}`;

const planned = (item: Day['ejercicios'][number]) =>
  setsLabel({ series: item.seriesObjetivo, repsMin: item.repsMin, repsMax: item.repsMax });

/**
 * «Ver cambios» de una copia con versión nueva (D2): qué días y ejercicios
 * añadió, quitó o ajustó el original respecto de la copia. Los días se emparejan
 * por día de la semana y los ejercicios por ejercicio.
 */
export function diffRoutineVersions(copy: Pick<Routine, 'dias'>, source: Pick<Routine, 'dias'>): VersionChange[] {
  const changes: VersionChange[] = [];
  const mine = new Map(copy.dias.map((day, index) => [dayKey(day, index), day]));
  const theirs = new Map(source.dias.map((day, index) => [dayKey(day, index), day]));

  for (const [key, day] of theirs) {
    const before = mine.get(key);
    if (!before) {
      changes.push({ tipo: 'DIA_NUEVO', texto: `Día nuevo: ${dayName(day)} (${day.ejercicios.length} ejercicios)` });
      continue;
    }
    const beforeBy = new Map(before.ejercicios.map((e) => [e.ejercicio?.id ?? e.id, e]));
    const afterBy = new Map(day.ejercicios.map((e) => [e.ejercicio?.id ?? e.id, e]));
    for (const [id, item] of afterBy) {
      const old = beforeBy.get(id);
      const name = item.ejercicio?.nombre ?? 'Ejercicio';
      if (!old) {
        changes.push({ tipo: 'EJERCICIO_NUEVO', texto: `${dayName(day)}: se añade ${name}` });
      } else if (planned(old) !== planned(item)) {
        changes.push({
          tipo: 'EJERCICIO_CAMBIADO',
          texto: `${dayName(day)}: ${name} pasa de ${planned(old)} a ${planned(item)}`,
        });
      }
    }
    for (const [id, item] of beforeBy) {
      if (!afterBy.has(id)) {
        changes.push({ tipo: 'EJERCICIO_QUITADO', texto: `${dayName(day)}: se quita ${item.ejercicio?.nombre ?? 'un ejercicio'}` });
      }
    }
  }
  for (const [key, day] of mine) {
    if (!theirs.has(key)) changes.push({ tipo: 'DIA_QUITADO', texto: `Se quita el día ${dayName(day)}` });
  }
  return changes;
}
