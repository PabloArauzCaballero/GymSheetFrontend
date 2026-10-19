import { describe, expect, it } from 'vitest';
import { routineDayExerciseInputSchema } from '@gymsheet/schemas';
import {
  createDraftExercise,
  createEmptyDraft,
  createInitialState,
  describeSaveError,
  evaluateQuality,
  joinGroup,
  normalizeGroups,
  parseDraft,
  renumberGroups,
  routineDraftReducer,
  serializeDraft,
  toStructureInput,
  validateDayExercises,
  type DraftExercise,
  type WizardAction,
  type WizardState,
} from './index';

function run(actions: WizardAction[], from: WizardState = createInitialState()): WizardState {
  return actions.reduce(routineDraftReducer, from);
}

const ex = (id: string, over: Partial<DraftExercise> = {}): DraftExercise => ({
  ...createDraftExercise({ id, nombre: `Ej ${id}`, grupoMuscular: 'Pecho' }, 'HIPERTROFIA'),
  ...over,
});

/** Un lunes con los ejercicios dados, ya en el estado del asistente. */
function monday(list: DraftExercise[]): WizardState {
  return run([
    { type: 'alternarDia', dia: 1 },
    ...list.map((ejercicio): WizardAction => ({ type: 'agregarEjercicio', destino: 1, ejercicio })),
  ]);
}

const rows = (state: WizardState, dia = 1) =>
  state.draft.dias.find((d) => d.diaSemana === dia)?.ejercicios ?? [];

describe('superseries y circuitos (C3.d)', () => {
  it('une 2 contiguos en una superserie con transición 0, y separa', () => {
    const [a, b, c] = [ex('a'), ex('b'), ex('c')];
    let state = monday([a, b, c]);
    state = routineDraftReducer(state, { type: 'unirEnGrupo', destino: 1, uids: [b.uid, c.uid] });
    expect(rows(state).map((e) => [e.ejercicioId, e.grupo, e.descansoEntreSeg])).toEqual([
      ['a', null, null],
      ['b', 1, 0],
      ['c', 1, 0],
    ]);
    state = routineDraftReducer(state, { type: 'separarGrupo', destino: 1, grupo: 1 });
    expect(rows(state).every((e) => e.grupo === null && e.descansoEntreSeg === null)).toBe(true);
  });

  it('no une si no son contiguos o es uno solo', () => {
    const [a, b, c] = [ex('a'), ex('b'), ex('c')];
    const state = monday([a, b, c]);
    expect(
      routineDraftReducer(state, { type: 'unirEnGrupo', destino: 1, uids: [a.uid, c.uid] }),
    ).toBe(state);
    expect(routineDraftReducer(state, { type: 'unirEnGrupo', destino: 1, uids: [a.uid] })).toBe(
      state,
    );
    expect(
      routineDraftReducer(state, { type: 'unirEnGrupo', destino: 1, uids: [a.uid, 'nope'] }),
    ).toBe(state);
  });

  it('unir un miembro de un bloque con el siguiente hace un circuito con el bloque entero', () => {
    const [a, b, c, d] = [ex('a'), ex('b'), ex('c'), ex('d')];
    let state = monday([a, b, c, d]);
    state = run(
      [
        { type: 'unirEnGrupo', destino: 1, uids: [a.uid, b.uid] },
        { type: 'setDescansoEntre', destino: 1, grupo: 1, descansoEntreSeg: 15 },
        { type: 'unirEnGrupo', destino: 1, uids: [b.uid, c.uid] },
      ],
      state,
    );
    const grupos = rows(state).map((e) => e.grupo);
    expect(grupos[0]).not.toBeNull();
    expect(grupos.slice(0, 3)).toEqual([grupos[0], grupos[0], grupos[0]]);
    expect(grupos[3]).toBeNull();
    // Conserva la transición que ya tenía el bloque.
    expect(rows(state)[2]?.descansoEntreSeg).toBe(15);
  });

  it('la transición se acota a 0–60 s y solo toca su bloque', () => {
    const [a, b, c] = [ex('a'), ex('b'), ex('c')];
    let state = monday([a, b, c]);
    state = run(
      [
        { type: 'unirEnGrupo', destino: 1, uids: [a.uid, b.uid] },
        { type: 'setDescansoEntre', destino: 1, grupo: 1, descansoEntreSeg: 95 },
      ],
      state,
    );
    expect(rows(state).map((e) => e.descansoEntreSeg)).toEqual([60, 60, null]);
    expect(
      routineDraftReducer(state, {
        type: 'setDescansoEntre',
        destino: 1,
        grupo: 9,
        descansoEntreSeg: 5,
      }),
    ).toBe(state);
  });

  it('mover o quitar un ejercicio deja los bloques coherentes', () => {
    const [a, b, c] = [ex('a'), ex('b'), ex('c')];
    let state = run([{ type: 'unirEnGrupo', destino: 1, uids: [a.uid, b.uid] }], monday([a, b, c]));
    // Quitar uno de una superserie de 2 deja al otro suelto.
    const removed = routineDraftReducer(state, { type: 'quitarEjercicio', destino: 1, uid: a.uid });
    expect(rows(removed).map((e) => e.grupo)).toEqual([null, null]);
    // Sacar el A1 al final parte el bloque: los dos quedan sueltos.
    state = routineDraftReducer(state, { type: 'moverEjercicio', destino: 1, desde: 0, hacia: 2 });
    expect(rows(state).map((e) => [e.ejercicioId, e.grupo])).toEqual([
      ['b', null],
      ['c', null],
      ['a', null],
    ]);
  });

  it('por tiempo: duración acotada y sin reps; volver a reps recupera los del objetivo', () => {
    const a = ex('a');
    let state = monday([a]);
    state = routineDraftReducer(state, {
      type: 'setPorTiempo',
      destino: 1,
      uid: a.uid,
      duracionSeg: 30,
    });
    expect(rows(state)[0]).toMatchObject({ duracionSeg: 30, repsMin: null, repsMax: null });
    state = routineDraftReducer(state, {
      type: 'setPorTiempo',
      destino: 1,
      uid: a.uid,
      duracionSeg: 99999,
    });
    expect(rows(state)[0]?.duracionSeg).toBe(3600);
    state = routineDraftReducer(state, {
      type: 'setPorTiempo',
      destino: 1,
      uid: a.uid,
      duracionSeg: null,
    });
    expect(rows(state)[0]).toMatchObject({ duracionSeg: null, repsMin: 8, repsMax: 12 });
    expect(
      routineDraftReducer(state, { type: 'setPorTiempo', destino: 1, uid: 'x', duracionSeg: 30 }),
    ).toBe(state);
  });

  it('también funciona en el borrador de «Configurar juntos», y la copia lleva el bloque', () => {
    const [a, b] = [ex('a'), ex('b')];
    const state = run([
      { type: 'alternarDia', dia: 1 },
      { type: 'alternarDia', dia: 3 },
      { type: 'entrarSeleccion', dia: 1 },
      { type: 'alternarSeleccion', dia: 3 },
      { type: 'iniciarGrupo' },
      { type: 'agregarEjercicio', destino: 'grupo', ejercicio: a },
      { type: 'agregarEjercicio', destino: 'grupo', ejercicio: b },
      { type: 'unirEnGrupo', destino: 'grupo', uids: [a.uid, b.uid] },
      { type: 'confirmarGrupo' },
    ]);
    for (const dia of [1, 3]) {
      expect(rows(state, dia).map((e) => e.grupo)).toEqual([1, 1]);
    }
    // Cada día tiene sus propias claves.
    const all = [...rows(state, 1), ...rows(state, 3)].map((e) => e.uid);
    expect(new Set(all).size).toBe(4);
  });

  it('duplicar un día copia sus bloques enteros con número propio', () => {
    const [a, b, c] = [ex('a'), ex('b'), ex('c')];
    const x = ex('x');
    const y = ex('y');
    const state = run([
      { type: 'alternarDia', dia: 1 },
      { type: 'alternarDia', dia: 2 },
      { type: 'agregarEjercicio', destino: 1, ejercicio: a },
      { type: 'agregarEjercicio', destino: 1, ejercicio: b },
      { type: 'agregarEjercicio', destino: 1, ejercicio: c },
      { type: 'unirEnGrupo', destino: 1, uids: [b.uid, c.uid] },
      { type: 'agregarEjercicio', destino: 2, ejercicio: x },
      { type: 'agregarEjercicio', destino: 2, ejercicio: y },
      { type: 'unirEnGrupo', destino: 2, uids: [x.uid, y.uid] },
      { type: 'agregarEjercicio', destino: 2, ejercicio: ex('a') },
      { type: 'duplicarDia', desde: 1, hacia: [2] },
    ]);
    // «a» suelta ya estaba en el martes: no se repite. El bloque b-c llega como bloque 2.
    expect(rows(state, 2).map((e) => [e.ejercicioId, e.grupo])).toEqual([
      ['x', 1],
      ['y', 1],
      ['a', null],
      ['b', 2],
      ['c', 2],
    ]);
  });
});

describe('carga útil con bloques', () => {
  it('renumera los bloques 1..n por día, manda transición y duración y quita reps por tiempo', () => {
    const [a, b, c, d, e] = [ex('a'), ex('b'), ex('c'), ex('d'), ex('e')];
    const state = run(
      [
        { type: 'unirEnGrupo', destino: 1, uids: [d.uid, e.uid] },
        { type: 'unirEnGrupo', destino: 1, uids: [a.uid, b.uid] },
        { type: 'setDescansoEntre', destino: 1, grupo: 2, descansoEntreSeg: 10 },
        { type: 'setPorTiempo', destino: 1, uid: c.uid, duracionSeg: 45 },
      ],
      monday([a, b, c, d, e]),
    );
    // Internamente el bloque a-b es el 2 y el d-e el 1; al backend van por orden de aparición.
    expect(rows(state).map((x) => x.grupo)).toEqual([2, 2, null, 1, 1]);
    const sent = toStructureInput(state.draft).dias[0]?.ejercicios ?? [];
    expect(sent.map((x) => [x.ejercicioId, x.grupo, x.descansoEntreSeg])).toEqual([
      ['a', 1, 10],
      ['b', 1, 10],
      ['c', null, null],
      ['d', 2, 0],
      ['e', 2, 0],
    ]);
    expect(sent[2]).toMatchObject({ duracionSeg: 45, repsMin: null, repsMax: null });
    // Lo que se envía cumple el esquema compartido (mismos topes que el backend).
    for (const item of sent) {
      expect(
        routineDayExerciseInputSchema.safeParse({
          ...item,
          ejercicioId: '00000000-0000-4000-8000-000000000000',
        }).success,
      ).toBe(true);
    }
  });

  it('un grupo de uno o partido sale suelto aunque el borrador venga mal', () => {
    const list = [ex('a', { grupo: 5 }), ex('b'), ex('c', { grupo: 5 }), ex('d', { grupo: 5 })];
    expect(renumberGroups(list)).toEqual([null, null, 1, 1]);
  });
});

describe('validación de bloques y topes', () => {
  it('detecta bloques de uno o partidos (ROUTINE_GROUP_INVALID)', () => {
    const issues = validateDayExercises([ex('a', { grupo: 1 }), ex('b'), ex('c', { grupo: 1 })]);
    expect(issues).toEqual([
      {
        codigo: 'GRUPO_INVALIDO',
        mensaje: 'Una superserie necesita al menos 2 ejercicios seguidos',
        grupo: 1,
      },
    ]);
    expect(validateDayExercises([ex('a', { grupo: 2 }), ex('b', { grupo: 2 })])).toEqual([]);
  });

  it('topes: series 1–10, reps 1–50, transición 0–60 y duración 1–3600', () => {
    const codes = (over: Partial<DraftExercise>) =>
      validateDayExercises([ex('a', over)]).map((i) => i.codigo);
    expect(codes({ seriesObjetivo: 11 })).toEqual(['FUERA_DE_RANGO']);
    expect(codes({ seriesObjetivo: 0 })).toEqual(['FUERA_DE_RANGO']);
    expect(codes({ seriesObjetivo: 10, repsMin: 1, repsMax: 50 })).toEqual([]);
    expect(codes({ repsMax: 51 })).toEqual(['FUERA_DE_RANGO']);
    expect(codes({ duracionSeg: 0, repsMin: null, repsMax: null })).toEqual(['FUERA_DE_RANGO']);
    expect(codes({ duracionSeg: 30, repsMin: 99, repsMax: 99 })).toEqual([]);
  });

  it('los problemas bloquean el guardado en los avisos de calidad', () => {
    const draft = {
      ...createEmptyDraft(),
      dias: [
        {
          diaSemana: 1 as const,
          nombre: 'Torso',
          ejercicios: [ex('a', { grupo: 1 }), ex('b', { seriesObjetivo: 69 })],
        },
      ],
    };
    const { bloqueos } = evaluateQuality(draft);
    expect(bloqueos.map((b) => b.codigo)).toEqual(['GRUPO_INVALIDO', 'FUERA_DE_RANGO']);
    expect(bloqueos[1]).toMatchObject({
      dia: 1,
      mensaje: 'Lunes · Torso · Ej b: las series van de 1 a 10',
    });
  });

  it('normalizar separa un bloque partido y suelta los de uno', () => {
    const out = normalizeGroups([
      ex('a', { grupo: 1, descansoEntreSeg: 5 }),
      ex('b', { grupo: 1 }),
      ex('c', { descansoEntreSeg: 10 }),
      ex('d', { grupo: 1 }),
      ex('e', { grupo: 1 }),
      ex('f', { grupo: 3 }),
    ]);
    expect(out.map((e) => [e.grupo, e.descansoEntreSeg])).toEqual([
      [1, 5],
      [1, null],
      [null, null],
      [4, null],
      [4, null],
      [null, null],
    ]);
    expect(joinGroup(out, [])).toBeNull();
  });
});

describe('errores de guardado nuevos', () => {
  it('ROUTINE_GROUP_INVALID vuelve a los días y ROUTINE_NOT_OWNED pide guardarla', () => {
    expect(
      describeSaveError({ message: 'x', status: 400, code: 'ROUTINE_GROUP_INVALID' }),
    ).toMatchObject({
      mensaje: 'Una superserie necesita al menos 2 ejercicios seguidos',
      paso: 4,
      reintentable: false,
    });
    expect(
      describeSaveError({ message: 'x', status: 403, code: 'ROUTINE_NOT_OWNED' }).mensaje,
    ).toBe('Guárdala en tus rutinas para activarla');
  });
});

describe('borradores guardados antes de C3.d', () => {
  const v1Exercise = {
    ejercicioId: 'a',
    nombre: 'Press',
    grupoMuscular: 'Pecho',
    seriesObjetivo: 3,
    repsMin: 8,
    repsMax: 12,
    pesoObjetivoKg: null,
    rirObjetivo: null,
    descansoSeg: 90,
    nota: null,
  };
  const v1 = (ejercicios: unknown[]) =>
    JSON.stringify({
      v: 1,
      paso: 4,
      draft: { ...createEmptyDraft(), dias: [{ diaSemana: 1, nombre: '', ejercicios }] },
    });

  it('se migran con uid propio, sueltos y por reps', () => {
    const parsed = parseDraft(v1([v1Exercise, v1Exercise]));
    expect(parsed?.paso).toBe(4);
    const list = parsed?.draft.dias[0]?.ejercicios ?? [];
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({
      ...v1Exercise,
      grupo: null,
      descansoEntreSeg: null,
      duracionSeg: null,
    });
    expect(list[0]?.uid).toBeTruthy();
    expect(list[0]?.uid).not.toBe(list[1]?.uid);
  });

  it('un borrador v2 conserva uids, bloques y duración', () => {
    const [a, b] = [ex('a'), ex('b')];
    const state = run(
      [
        { type: 'unirEnGrupo', destino: 1, uids: [a.uid, b.uid] },
        { type: 'setPorTiempo', destino: 1, uid: b.uid, duracionSeg: 40 },
      ],
      monday([a, b]),
    );
    expect(parseDraft(serializeDraft(state.draft, 2))).toEqual({ draft: state.draft, paso: 2 });
  });
});
