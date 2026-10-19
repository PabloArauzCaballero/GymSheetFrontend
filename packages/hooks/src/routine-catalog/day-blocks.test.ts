import { describe, expect, it } from 'vitest';
import type { ExerciseMedia, Routine, RoutineExercise, RoutineWeek } from '@gymsheet/types';
import {
  blockLetter,
  blockRestLabel,
  blockTitle,
  buildDayBlocks,
  canActivateProgram,
  canSaveCopy,
  clockLabel,
  copyNumberFromName,
  copyVersionLabel,
  dayView,
  estimateBlocksSeconds,
  estimateDayMinutes,
  exerciseDisplayName,
  exerciseMetaLabel,
  exerciseThumb,
  restLabel,
  savedCopyLabel,
  secondsLabel,
  setsLabel,
  stripCopySuffix,
  transitionLabel,
  type BlockableItem,
} from '../index';

const item = (over: Partial<BlockableItem> = {}): BlockableItem => ({
  grupo: null,
  grupoTipo: null,
  series: 3,
  descansoSeg: 90,
  descansoEntreSeg: null,
  duracionSeg: null,
  ...over,
});

describe('bloques del día', () => {
  it('sueltos, superserie y circuito con letras y posiciones', () => {
    const blocks = buildDayBlocks([
      item(),
      item({ grupo: 7, descansoEntreSeg: 0, descansoSeg: 15 }),
      item({ grupo: 7, descansoSeg: 120, series: 4 }),
      item({ grupo: 2, descansoEntreSeg: 15 }),
      item({ grupo: 2 }),
      item({ grupo: 2, descansoSeg: 60 }),
    ]);
    expect(blocks.map((b) => [b.kind, b.label])).toEqual([
      ['single', null],
      ['superserie', 'A'],
      ['circuito', 'B'],
    ]);
    expect(blocks[0]?.items[0]?.posicion).toBeNull();
    expect(blocks[1]).toMatchObject({
      rondas: 4,
      descansoTrasVueltaSeg: 120,
      descansoEntreSeg: 0,
    });
    expect(blocks[1]?.items.map((i) => i.posicion)).toEqual(['A1', 'A2']);
    expect(blocks[2]).toMatchObject({
      descansoTrasVueltaSeg: 60,
      descansoEntreSeg: 15,
    });
    expect(blocks[2]?.items.map((i) => i.posicion)).toEqual(['B1', 'B2', 'B3']);
  });

  it('respeta el grupoTipo del backend y trata un grupo de uno, o partido, como sueltos', () => {
    expect(
      buildDayBlocks([item({ grupo: 1, grupoTipo: 'CIRCUITO' }), item({ grupo: 1 })])[0]?.kind,
    ).toBe('circuito');
    const broken = buildDayBlocks([item({ grupo: 1 }), item(), item({ grupo: 1 })]);
    expect(broken.map((b) => b.kind)).toEqual(['single', 'single', 'single']);
  });

  it('letras más allá de la Z', () => {
    expect(blockLetter(0)).toBe('A');
    expect(blockLetter(25)).toBe('Z');
    expect(blockLetter(26)).toBe('AA');
  });

  it('estima la duración: series × (trabajo + descanso) y el descanso del bloque una vez por vuelta', () => {
    // Suelto: 3 × (40 + 90) = 390 s.
    expect(estimateBlocksSeconds(buildDayBlocks([item()]))).toBe(390);
    // Por tiempo: 3 × (30 + 60) = 270 s.
    expect(
      estimateBlocksSeconds(buildDayBlocks([item({ duracionSeg: 30, descansoSeg: 60 })])),
    ).toBe(270);
    // Superserie 3 vueltas: (40 + 15 + 40 + 120) × 3 = 645 s; el descanso del A1 no cuenta.
    const superset = buildDayBlocks([
      item({ grupo: 1, descansoEntreSeg: 15, descansoSeg: 999 }),
      item({ grupo: 1, descansoSeg: 120 }),
    ]);
    expect(estimateBlocksSeconds(superset)).toBe(645);
    // Series desiguales: la vuelta 3 solo tiene el A2 (40 + 120).
    const uneven = buildDayBlocks([
      item({ grupo: 1, series: 2, descansoEntreSeg: 0 }),
      item({ grupo: 1, series: 3, descansoSeg: 120 }),
    ]);
    expect(estimateBlocksSeconds(uneven)).toBe(2 * (80 + 120) + 160);
    // Sin descanso indicado se suponen 90 s; trabajo y descanso configurables.
    expect(estimateBlocksSeconds(buildDayBlocks([item({ descansoSeg: null, series: 1 })]))).toBe(
      130,
    );
    expect(
      estimateBlocksSeconds(buildDayBlocks([item({ series: 1 })]), {
        trabajoSeg: 10,
      }),
    ).toBe(100);
  });

  it('minutos estimados: redondeo y mínimo de 1', () => {
    expect(estimateDayMinutes([])).toBe(0);
    expect(estimateDayMinutes([item({ series: 1, descansoSeg: 0, duracionSeg: 5 })])).toBe(1);
    expect(estimateDayMinutes([item(), item(), item()])).toBe(20); // 1170 s
  });
});

describe('etiquetas del día', () => {
  it('series, reps, tiempo, peso y RIR', () => {
    expect(setsLabel({ series: 3, repsMin: 8, repsMax: 12 })).toBe('3 × 8–12');
    expect(setsLabel({ series: 3, repsMin: null, repsMax: null, duracionSeg: 45 })).toBe(
      '3 × 45 s',
    );
    expect(setsLabel({ series: 1, repsMin: null, repsMax: null })).toBe('1 serie');
    expect(
      exerciseMetaLabel({
        series: 3,
        repsMin: 8,
        repsMax: 12,
        pesoObjetivoKg: 62.5,
        rirObjetivo: 2,
      }),
    ).toBe('3 series · 8–12 reps · 62,5 kg · RIR 2');
    expect(
      exerciseMetaLabel({
        series: 3,
        repsMin: null,
        repsMax: null,
        duracionSeg: 30,
      }),
    ).toBe('3 series · 30 s');
    expect(
      exerciseMetaLabel({
        series: 4,
        repsMin: 5,
        repsMax: 5,
        pesoObjetivoKg: 0,
      }),
    ).toBe('4 series · 5 reps');
  });

  it('relojes, descansos y conectores', () => {
    expect(clockLabel(120)).toBe('2:00');
    expect(clockLabel(45)).toBe('0:45');
    expect(secondsLabel(60)).toBe('1 min');
    expect(secondsLabel(75)).toBe('1:15 min');
    expect(restLabel(120)).toBe('Descanso 2:00');
    expect(restLabel(0)).toBe('Sin descanso');
    expect(restLabel(null)).toBeNull();
    expect(transitionLabel(0)).toBe('sin descanso');
    expect(transitionLabel(null)).toBe('sin descanso');
    expect(transitionLabel(15)).toBe('15 s');
  });

  it('título y descanso del bloque', () => {
    const [single, superset, circuit] = buildDayBlocks([
      item({ descansoSeg: 60 }),
      item({ grupo: 1, descansoSeg: 0 }),
      item({ grupo: 1, descansoSeg: 90 }),
      item({ grupo: 2, series: 1 }),
      item({ grupo: 2, series: 1 }),
      item({ grupo: 2, series: 1, descansoSeg: null }),
    ]);
    expect(blockTitle(single!)).toBeNull();
    expect(blockTitle(superset!)).toBe('Superserie A · 3 vueltas');
    expect(blockTitle(circuit!)).toBe('Circuito B · 1 vuelta');
    expect(blockRestLabel(superset!)).toBe('Descanso 1:30 tras la vuelta');
    expect(blockRestLabel(single!)).toBe('Descanso 1:00');
    expect(blockRestLabel(circuit!)).toBeNull();
  });
});

const media = (over: Partial<ExerciseMedia>): ExerciseMedia =>
  ({
    id: 'm',
    mediaType: 'IMAGE',
    url: 'https://x/img.png',
    thumbnailUrl: null,
    altText: 'alt',
    isPrimary: false,
    sortOrder: 0,
    status: 'ACTIVE',
    ...over,
  }) as ExerciseMedia;

describe('miniatura y nombre del ejercicio', () => {
  it('prefiere la principal, usa el póster de un vídeo y nunca el vídeo', () => {
    expect(exerciseThumb([])).toBeNull();
    expect(exerciseThumb(undefined)).toBeNull();
    expect(
      exerciseThumb([
        media({ url: 'https://x/a.png', sortOrder: 0 }),
        media({
          mediaType: 'VIDEO',
          url: 'https://x/v.mp4',
          thumbnailUrl: 'https://x/p.webp',
          isPrimary: true,
        }),
      ]),
    ).toEqual({ url: 'https://x/p.webp', mediaType: 'VIDEO', altText: 'alt' });
    expect(
      exerciseThumb([media({ mediaType: 'VIDEO', url: 'https://x/v.mp4', isPrimary: true })]),
    ).toBeNull();
    expect(exerciseThumb([media({ status: 'INACTIVE' })])).toBeNull();
    expect(exerciseThumb([media({ mediaType: 'GIF', url: 'https://x/g.gif' })])?.url).toBe(
      'https://x/g.gif',
    );
  });

  it('enseña el nombre en español si existe', () => {
    expect(
      exerciseDisplayName({
        nombre: 'Barbell Bench Press',
        nombreEs: 'Press de banca',
      }),
    ).toBe('Press de banca');
    expect(exerciseDisplayName({ nombre: 'Barbell Bench Press', nombreEs: null })).toBe(
      'Barbell Bench Press',
    );
    expect(exerciseDisplayName({ nombre: 'Plank', nombreEs: '  ' })).toBe('Plank');
    expect(exerciseDisplayName(null)).toBe('Ejercicio no disponible');
  });
});

const ex = (id: string, nombre: string, extra: Record<string, unknown> = {}) =>
  ({
    id,
    nombre,
    grupoMuscular: 'chest',
    bodyPart: 'chest',
    targetMuscle: 'pectorals',
    media: [],
    tipoEjercicio: 'GLOBAL',
    ...extra,
  }) as unknown as RoutineExercise['ejercicio'];

const rx = (over: Partial<RoutineExercise> & { id: string }): RoutineExercise => ({
  orden: 1,
  seriesObjetivo: 3,
  repsMin: 8,
  repsMax: 12,
  pesoObjetivoKg: null,
  rirObjetivo: null,
  descansoSeg: 90,
  nota: null,
  grupo: null,
  grupoTipo: null,
  descansoEntreSeg: null,
  duracionSeg: null,
  ejercicio: ex(`e-${over.id}`, `Ej ${over.id}`),
  ...over,
});

describe('dayView estructurado', () => {
  const routine = {
    dias: [
      {
        id: 'd1',
        diaSemana: 1,
        nombre: 'Torso A',
        orden: 1,
        ejercicios: [
          rx({
            id: 'r1',
            pesoObjetivoKg: 60,
            rirObjetivo: 2,
            descansoSeg: 120,
            nota: ' Codos a 45° ',
            ejercicio: ex('e1', 'Barbell Bench Press', {
              nombreEs: 'Press de banca',
              media: [media({ isPrimary: true, url: 'https://x/bench.png' })],
            }),
          }),
          rx({
            id: 'r2',
            grupo: 4,
            grupoTipo: 'SUPERSERIE',
            descansoEntreSeg: 0,
            descansoSeg: 0,
          }),
          rx({ id: 'r3', grupo: 4, grupoTipo: 'SUPERSERIE', descansoSeg: 90 }),
          rx({
            id: 'r4',
            repsMin: null,
            repsMax: null,
            duracionSeg: 30,
            descansoSeg: 60,
          }),
        ],
      },
    ],
  } as unknown as Routine;

  it('da imagen, nombre en español, objetivos, nota y bloques', () => {
    const view = dayView(routine, undefined, 'd1');
    expect(view?.titulo).toBe('Lunes · Torso A');
    const first = view?.ejercicios[0];
    expect(first).toMatchObject({
      nombre: 'Press de banca',
      imagen: { url: 'https://x/bench.png' },
      series: 3,
      repsMin: 8,
      repsMax: 12,
      pesoObjetivoKg: 60,
      rirObjetivo: 2,
      descansoSeg: 120,
      nota: 'Codos a 45°',
      setsLabel: '3 × 8–12',
      metaLabel: '3 series · 8–12 reps · 60 kg · RIR 2',
      posicion: null,
      targetMuscle: 'pectorals',
    });
    expect(first?.media).toHaveLength(1);
    expect(view?.bloques.map((b) => b.kind)).toEqual(['single', 'superserie', 'single']);
    expect(view?.ejercicios.map((e) => e.posicion)).toEqual([null, 'A1', 'A2', null]);
    expect(view?.ejercicios[3]).toMatchObject({
      setsLabel: '3 × 30 s',
      duracionSeg: 30,
      repsMin: null,
    });
    expect(view?.totalSeries).toBe(12);
    // 3×(40+120) + 3×(40+0+40+90) + 3×(30+60) = 480 + 510 + 270 = 1260 s = 21 min.
    expect(view?.minutosEstimados).toBe(21);
  });

  it('la semana generada manda en series, descansos y bloques', () => {
    const week = {
      numero: 4,
      esDescarga: true,
      factorVolumen: 0.5,
      factorCarga: 0.9,
      nota: null,
      dias: [
        {
          diaId: 'd1',
          diaSemana: 1,
          nombre: 'Torso A',
          ejercicios: [
            {
              routineExerciseId: 'r1',
              ejercicioId: 'e1',
              orden: 1,
              series: 2,
              repsMin: 8,
              repsMax: 12,
              pesoObjetivoKg: 54,
              descansoSeg: 150,
              rirObjetivo: 3,
              nota: null,
              grupo: null,
              grupoTipo: null,
              descansoEntreSeg: null,
              duracionSeg: null,
            },
          ],
        },
      ],
    } satisfies RoutineWeek;
    const view = dayView(routine, week, 'd1');
    expect(view?.ejercicios[0]).toMatchObject({
      series: 2,
      pesoObjetivoKg: 54,
      descansoSeg: 150,
      rirObjetivo: 3,
      ajustado: true,
      nota: 'Codos a 45°',
    });
    expect(view?.ejercicios[1]?.ajustado).toBe(false);
  });

  it('un día vacío no tiene bloques ni minutos', () => {
    const empty = {
      dias: [{ id: 'd', diaSemana: null, nombre: null, orden: 1, ejercicios: [] }],
    } as unknown as Routine;
    expect(dayView(empty, undefined, 'd')).toMatchObject({
      titulo: 'Cualquier día',
      bloques: [],
      minutosEstimados: 0,
    });
  });
});

describe('activar y guardar (C1, C2)', () => {
  const r = (over: Partial<Routine>) =>
    ({
      esMia: true,
      estado: 'ACTIVE',
      nombre: 'Torso',
      numeroCopia: null,
      dias: [{ ejercicios: [{}] }],
      ...over,
    }) as Routine;

  it('solo se activa una rutina propia, activa y con ejercicios', () => {
    expect(canActivateProgram(r({}))).toBe(true);
    expect(canActivateProgram(r({ esMia: false }))).toBe(false);
    expect(canActivateProgram(r({ estado: 'ARCHIVED' }))).toBe(false);
    expect(canActivateProgram(r({ dias: [] }))).toBe(false);
    expect(canActivateProgram(r({ puedoEditar: false, esOficial: true }))).toBe(true);
    expect(canActivateProgram(null)).toBe(false);
  });

  it('guardar una copia solo en una rutina ajena', () => {
    expect(canSaveCopy(r({ esMia: false }))).toBe(true);
    expect(canSaveCopy(r({}))).toBe(false);
    expect(canSaveCopy(undefined)).toBe(false);
  });

  it('número de copia y nombre', () => {
    expect(copyNumberFromName('Torso-Pierna 4 días · v2')).toBe(2);
    expect(copyNumberFromName('Torso-Pierna 4 días')).toBeNull();
    expect(stripCopySuffix('Torso-Pierna 4 días · v12')).toBe('Torso-Pierna 4 días');
    expect(copyVersionLabel(r({ numeroCopia: 3 }))).toBe('v3');
    expect(copyVersionLabel(r({ nombre: 'X · v2' }))).toBe('v2');
    expect(copyVersionLabel(r({}))).toBeNull();
    expect(savedCopyLabel(2)).toBe('Ya la guardaste como v2');
  });
});
