import { describe, expect, it } from 'vitest';
import type { RoutineCard } from '@gymsheet/schemas';
import type { Routine } from '@gymsheet/types';
import {
  activeFilterCount,
  authorLabel,
  cardSubtitle,
  dayView,
  durationLabel,
  emptyCatalogFilters,
  hasActiveFilters,
  invitationHeadline,
  isAnyDayRoutine,
  ratingLabel,
  routineColumns,
  setsLabel,
  toCatalogQuery,
  weekDots,
} from './index';

const card = (patch: Partial<RoutineCard> = {}): RoutineCard => ({
  id: 'a',
  nombre: 'Empuje 4 días',
  descripcion: null,
  objetivo: 'FUERZA',
  duracionSemanas: 12,
  diasPorSemana: 4,
  ejerciciosTotal: 20,
  visibilidad: 'PUBLIC',
  esOficial: false,
  esMia: false,
  autor: { id: 'u', nombre: 'Ana P.' },
  atribucion: null,
  valoracion: { promedio: 4.6, total: 32 },
  copias: 3,
  publicadaEn: null,
  version: 1,
  estadoModeracion: 'VISIBLE',
  dias: [1, 2, 4, 5].map((d) => ({ diaSemana: d, nombre: null, ejerciciosTotal: 5 })),
  invitacion: null,
  ...patch,
});

describe('catálogo: consulta', () => {
  it('Públicas lleva filtros y orden; las otras pestañas no', () => {
    const state = { ...emptyCatalogFilters, objetivo: 'FUERZA' as const, diasPorSemana: 4, deMiGimnasio: true };
    expect(toCatalogQuery('public', 'created', state)).toMatchObject({
      scope: 'public', objetivo: 'FUERZA', diasPorSemana: 4, deMiGimnasio: true, orden: 'populares',
    });
    const official = toCatalogQuery('official', 'created', state);
    expect(official.scope).toBe('official');
    expect(official.objetivo).toBeUndefined();
    expect(official.orden).toBeUndefined();
  });
  it('Mías usa mine o shared según el chip', () => {
    expect(toCatalogQuery('mine', 'created', emptyCatalogFilters).scope).toBe('mine');
    expect(toCatalogQuery('mine', 'shared', emptyCatalogFilters).scope).toBe('shared');
  });
  it('cuenta los filtros aplicados, sin el buscador', () => {
    expect(activeFilterCount(emptyCatalogFilters)).toBe(0);
    expect(activeFilterCount({ ...emptyCatalogFilters, objetivo: 'FUERZA', deMiGimnasio: true })).toBe(2);
    expect(hasActiveFilters({ ...emptyCatalogFilters, q: ' press ' })).toBe(true);
    expect(hasActiveFilters(emptyCatalogFilters)).toBe(false);
  });
  it('pasa el cursor tal cual', () => {
    expect(toCatalogQuery('public', 'created', emptyCatalogFilters, 'abc').cursor).toBe('abc');
  });
});

describe('catálogo: tarjetas', () => {
  it('describe la duración y los días', () => {
    expect(durationLabel(12)).toBe('3 meses');
    expect(durationLabel(6)).toBe('6 semanas');
    expect(durationLabel(1)).toBe('1 semana');
    expect(durationLabel(null)).toBe('Sin duración fija');
    expect(cardSubtitle(card())).toBe('4 días/sem · 3 meses');
    expect(cardSubtitle(card({ diasPorSemana: 1, duracionSemanas: null }))).toBe('1 día/sem · Sin duración fija');
  });
  it('marca los días que entrena', () => {
    expect(weekDots(card()).map((d) => d.entrena)).toEqual([true, true, false, true, true, false, false]);
  });
  it('autor, valoración e invitación', () => {
    expect(authorLabel(card({ esOficial: true }))).toBe('REPP');
    expect(authorLabel(card({ esMia: true }))).toBe('Tú');
    expect(authorLabel(card())).toBe('Ana P.');
    expect(ratingLabel({ promedio: 4.6, total: 32 })).toBe('★ 4,6 (32)');
    expect(ratingLabel({ promedio: null, total: 0 })).toBe('Sin valoraciones');
    expect(
      invitationHeadline(card({ invitacion: { id: 'i', estado: 'PENDING', origen: 'INVITACION', deParte: { id: 'u', nombre: 'Ana P.' } } })),
    ).toBe('Ana P. te compartió «Empuje 4 días»');
  });
});

const exercise = (id: string, nombre: string) =>
  ({ id, nombre, grupoMuscular: 'Pecho' }) as unknown as NonNullable<Routine['dias'][number]['ejercicios'][number]['ejercicio']>;

const routine = {
  dias: [
    {
      id: 'd1', diaSemana: 2, nombre: 'Tirón', orden: 1,
      ejercicios: [
        { id: 're1', orden: 1, seriesObjetivo: 4, repsMin: 8, repsMax: 12, pesoObjetivoKg: 60, rirObjetivo: null, descansoSeg: null, nota: null, ejercicio: exercise('e1', 'Remo') },
      ],
    },
    { id: 'd2', diaSemana: null, nombre: null, orden: 2, ejercicios: [] },
  ],
} as unknown as Routine;

describe('calendario', () => {
  it('columnas de la semana y rutina de cualquier día', () => {
    const cols = routineColumns(routine);
    expect(cols[1]).toMatchObject({ dia: 2, entrena: true, nombre: 'Tirón', ejercicios: 1 });
    expect(cols[0]?.entrena).toBe(false);
    expect(isAnyDayRoutine(routine)).toBe(false);
    expect(isAnyDayRoutine({ dias: [{ ...routine.dias[1]! }] })).toBe(true);
  });
  it('la hoja del día toma series de la semana generada y marca el ajuste', () => {
    const week = {
      numero: 4, esDescarga: true, factorVolumen: 0.5, factorCarga: 0.9, nota: null,
      dias: [{ diaId: 'd1', diaSemana: 2, nombre: 'Tirón', ejercicios: [{ routineExerciseId: 're1', ejercicioId: 'e1', orden: 1, series: 2, repsMin: 8, repsMax: 12, pesoObjetivoKg: 54 }] }],
    };
    const view = dayView(routine, week, 'd1');
    expect(view?.titulo).toBe('Martes · Tirón');
    expect(view?.ejercicios[0]).toMatchObject({ nombre: 'Remo', series: 2, pesoObjetivoKg: 54, ajustado: true });
    expect(dayView(routine, undefined, 'd1')?.ejercicios[0]?.ajustado).toBe(false);
    expect(dayView(routine, week, 'nope')).toBeNull();
    expect(dayView(routine, week, 'd2')?.titulo).toBe('Cualquier día');
  });
  it('series y repeticiones en una línea', () => {
    expect(setsLabel({ series: 3, repsMin: 8, repsMax: 12 })).toBe('3 × 8-12');
    expect(setsLabel({ series: 5, repsMin: 5, repsMax: 5 })).toBe('5 × 5');
    expect(setsLabel({ series: 4, repsMin: null, repsMax: null })).toBe('4 series');
  });
});
