import { describe, expect, it } from 'vitest';
import type { RoutineCard, RoutineRecommendation } from '@gymsheet/types';
import {
  FALLBACK_MOTIVO,
  emptyCatalogFilters,
  forYouBlock,
  initialCatalogFilters,
  recommendationReason,
  recommendedRoutinesKey,
} from './index';

function card(id: string): RoutineCard {
  return {
    id,
    nombre: `Rutina ${id}`,
    descripcion: null,
    objetivo: 'HIPERTROFIA',
    duracionSemanas: 8,
    diasPorSemana: 4,
    ejerciciosTotal: 20,
    visibilidad: 'PUBLIC',
    esOficial: true,
    esMia: false,
    autor: { id: 'repp', nombre: 'REPP' },
    atribucion: null,
    valoracion: { promedio: 4.6, total: 12 },
    copias: 30,
    publicadaEn: null,
    version: 1,
    estadoModeracion: 'VISIBLE',
    dias: [],
    invitacion: null,
  };
}

const rec = (id: string, motivo = 'Porque elegiste Hipertrofia · 4 días · gimnasio'): RoutineRecommendation => ({
  rutina: card(id),
  motivo,
});

describe('forYouBlock', () => {
  it('sin recomendaciones no hay bloque', () => {
    expect(forYouBlock(undefined)).toBeNull();
    expect(forYouBlock(null)).toBeNull();
    expect(forYouBlock([])).toBeNull();
  });

  it('la primera es la héroe y las dos siguientes, alternativas, en el orden del servidor', () => {
    const block = forYouBlock([rec('a'), rec('b'), rec('c'), rec('d')]);
    expect(block?.hero.rutina.id).toBe('a');
    expect(block?.alternatives.map((item) => item.rutina.id)).toEqual(['b', 'c']);
  });

  it('quita rutinas repetidas', () => {
    const block = forYouBlock([rec('a'), rec('a'), rec('b')]);
    expect(block?.alternatives.map((item) => item.rutina.id)).toEqual(['b']);
  });

  it('una sola recomendación es héroe sin alternativas', () => {
    expect(forYouBlock([rec('a')])).toEqual({ hero: rec('a'), alternatives: [] });
  });
});

describe('recommendationReason', () => {
  it('limpia espacios y deja el texto del servidor', () => {
    expect(recommendationReason({ motivo: '  Porque elegiste  Fuerza ·  3 días ' })).toBe(
      'Porque elegiste Fuerza · 3 días',
    );
  });
  it('nunca devuelve vacío', () => {
    expect(recommendationReason({ motivo: '   ' })).toBe(FALLBACK_MOTIVO);
  });
});

describe('initialCatalogFilters', () => {
  it('precarga el objetivo del perfil', () => {
    expect(initialCatalogFilters('FUERZA')).toEqual({ ...emptyCatalogFilters, objetivo: 'FUERZA' });
  });
  it('sin objetivo, los filtros vacíos', () => {
    expect(initialCatalogFilters(null)).toEqual(emptyCatalogFilters);
    expect(initialCatalogFilters(undefined)).toEqual(emptyCatalogFilters);
  });
});

it('la clave cuelga de las rutinas para que invalidarlas refresque las recomendaciones', () => {
  expect(recommendedRoutinesKey(3)).toEqual(['routines', 'recommended', 3]);
});
