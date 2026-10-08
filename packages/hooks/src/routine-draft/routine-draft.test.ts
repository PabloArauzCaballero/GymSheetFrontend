import { describe, expect, it, vi } from 'vitest';
import {
  canAdvance,
  createDraftExercise,
  createEmptyDraft,
  createInitialState,
  describeSaveError,
  durationInWeeks,
  evaluateQuality,
  firstInvalidStep,
  hasContent,
  muscleZone,
  saveRoutineDraft,
  type RoutineSaveServices,
  parseDraft,
  planWeeks,
  progressLabel,
  routineDraftReducer,
  serializeDraft,
  summarizeStructure,
  toCreateInput,
  toStructureInput,
  toWeekOverrides,
  toggledWeekChoice,
  validateStep,
  type DraftExercise,
  type WizardAction,
  type WizardState,
} from './index';

function run(actions: WizardAction[], from: WizardState = createInitialState()): WizardState {
  return actions.reduce(routineDraftReducer, from);
}

function exercise(id: string, group = 'Pecho', sets = 3): DraftExercise {
  return {
    ...createDraftExercise({ id, nombre: `Ej ${id}`, grupoMuscular: group }, 'HIPERTROFIA'),
    seriesObjetivo: sets,
  };
}

const withDays = (days: Array<1 | 2 | 3 | 4 | 5 | 6 | 7>) =>
  run(days.map((dia) => ({ type: 'alternarDia' as const, dia })));

describe('validación por paso', () => {
  it('el nombre es obligatorio, de 3 a 160 caracteres', () => {
    const draft = createEmptyDraft();
    expect(validateStep(draft, 'nombre').nombre).toBe('Escribe un nombre');
    expect(validateStep({ ...draft, nombre: '  ab ' }, 'nombre').nombre).toBe(
      'Usa al menos 3 caracteres',
    );
    expect(validateStep({ ...draft, nombre: 'a'.repeat(161) }, 'nombre').nombre).toMatch(/160/);
    expect(validateStep({ ...draft, nombre: 'QA Empuje 4 días' }, 'nombre')).toEqual({});
  });

  it('la descripción es opcional pero acotada a 1000', () => {
    const draft = createEmptyDraft();
    expect(validateStep(draft, 'descripcion')).toEqual({});
    expect(
      validateStep({ ...draft, descripcion: 'x'.repeat(1001) }, 'descripcion').descripcion,
    ).toMatch(/1000/);
  });

  it('la duración no pasa de 52 semanas (13 meses = 52, 14 = 56)', () => {
    const draft = createEmptyDraft();
    expect(
      validateStep({ ...draft, duracion: { unidad: 'meses', cantidad: 13 } }, 'duracion'),
    ).toEqual({});
    expect(
      validateStep({ ...draft, duracion: { unidad: 'meses', cantidad: 14 } }, 'duracion').duracion,
    ).toMatch(/52/);
    expect(
      validateStep({ ...draft, duracion: { unidad: 'semanas', cantidad: 0 } }, 'duracion').duracion,
    ).toMatch(/mínima/);
  });

  it('pide al menos un día y deja de bloquear al elegirlo', () => {
    expect(validateStep(createEmptyDraft(), 'dias').dias).toBe('Elige al menos un día');
    expect(canAdvance(withDays([1]).draft, 4)).toBe(true);
    expect(canAdvance(createEmptyDraft(), 4)).toBe(false);
  });

  it('encuentra el primer paso inválido y etiqueta el progreso', () => {
    expect(firstInvalidStep(createEmptyDraft())).toBe(0);
    expect(firstInvalidStep({ ...withDays([1]).draft, nombre: 'Mi rutina' })).toBeNull();
    expect(progressLabel(1)).toBe('Paso 2 de 6 · Descripción');
  });
});

describe('progresión según el objetivo (D5)', () => {
  it('arranca encendida en Hipertrofia y Fuerza y apagada en el resto', () => {
    const progression = (
      goal: Parameters<typeof routineDraftReducer>[1] extends infer A ? A : never,
    ) => routineDraftReducer(createInitialState(), goal).draft.progresion.activa;
    expect(progression({ type: 'objetivo', objetivo: 'HIPERTROFIA' })).toBe(true);
    expect(progression({ type: 'objetivo', objetivo: 'FUERZA' })).toBe(true);
    expect(progression({ type: 'objetivo', objetivo: 'RESISTENCIA' })).toBe(false);
    expect(progression({ type: 'objetivo', objetivo: 'SALUD_GENERAL' })).toBe(false);
    expect(progression({ type: 'objetivo', objetivo: null })).toBe(true);
  });
});

describe('duración y resumen', () => {
  it('3 meses son 12 semanas y el resumen lo dice', () => {
    const state = run([
      { type: 'duracion', duracion: { unidad: 'meses', cantidad: 3 } },
      ...[1, 2, 4, 5].map((dia) => ({
        type: 'alternarDia' as const,
        dia: dia as 1,
      })),
    ]);
    expect(durationInWeeks(state.draft.duracion)).toBe(12);
    expect(summarizeStructure(state.draft)).toBe('4 días · 12 semanas');
  });
});

describe('días y ejercicios', () => {
  it('mantiene los días ordenados y los quita al desmarcarlos', () => {
    const state = withDays([5, 1, 3]);
    expect(state.draft.dias.map((d) => d.diaSemana)).toEqual([1, 3, 5]);
    const without = routineDraftReducer(state, { type: 'alternarDia', dia: 3 });
    expect(without.draft.dias.map((d) => d.diaSemana)).toEqual([1, 5]);
  });

  it('añade sin duplicar, quita, reordena y edita', () => {
    let state = withDays([1]);
    state = run(
      [
        { type: 'agregarEjercicio', destino: 1, ejercicio: exercise('a') },
        { type: 'agregarEjercicio', destino: 1, ejercicio: exercise('a') },
        { type: 'agregarEjercicio', destino: 1, ejercicio: exercise('b') },
        { type: 'agregarEjercicio', destino: 1, ejercicio: exercise('c') },
        { type: 'moverEjercicio', destino: 1, desde: 2, hacia: 0 },
        { type: 'quitarEjercicio', destino: 1, ejercicioId: 'b' },
        {
          type: 'editarEjercicio',
          destino: 1,
          ejercicioId: 'a',
          cambios: { seriesObjetivo: 4, repsMin: 6, repsMax: 8 },
        },
      ],
      state,
    );
    const day = state.draft.dias[0];
    expect(day?.ejercicios.map((e) => e.ejercicioId)).toEqual(['c', 'a']);
    expect(day?.ejercicios[1]).toMatchObject({
      seriesObjetivo: 4,
      repsMin: 6,
      repsMax: 8,
    });
  });

  it('ignora movimientos fuera de rango', () => {
    let state = withDays([1]);
    state = run([{ type: 'agregarEjercicio', destino: 1, ejercicio: exercise('a') }], state);
    const moved = routineDraftReducer(state, {
      type: 'moverEjercicio',
      destino: 1,
      desde: 0,
      hacia: 9,
    });
    expect(moved.draft.dias[0]?.ejercicios).toHaveLength(1);
  });

  it('los valores por defecto dependen del objetivo', () => {
    const base = { id: 'x', nombre: 'X', grupoMuscular: 'Pecho' };
    expect(createDraftExercise(base, 'FUERZA')).toMatchObject({
      seriesObjetivo: 5,
      repsMin: 3,
      repsMax: 5,
    });
    expect(createDraftExercise(base, 'HIPERTROFIA')).toMatchObject({
      seriesObjetivo: 3,
      repsMin: 8,
      repsMax: 12,
    });
    expect(createDraftExercise(base, 'RESISTENCIA')).toMatchObject({
      seriesObjetivo: 3,
      repsMin: 15,
      repsMax: 20,
    });
    expect(createDraftExercise(base, null)).toMatchObject({
      seriesObjetivo: 3,
      repsMin: 8,
      repsMax: 12,
    });
  });
});

describe('selección múltiple (RF-05)', () => {
  it('el toque sostenido entra al modo con ese día marcado y el siguiente toque añade', () => {
    let state = withDays([1, 3, 4]);
    expect(state.seleccion).toBeNull();
    state = run(
      [
        { type: 'entrarSeleccion', dia: 1 },
        { type: 'alternarSeleccion', dia: 4 },
      ],
      state,
    );
    expect(state.seleccion).toEqual([1, 4]);
  });

  it('el botón «Seleccionar» entra sin ningún día marcado', () => {
    const state = routineDraftReducer(withDays([1, 3]), {
      type: 'entrarSeleccion',
    });
    expect(state.seleccion).toEqual([]);
  });

  it('alternar una marca ya puesta la quita; fuera del modo no hace nada', () => {
    const base = withDays([1, 3]);
    expect(routineDraftReducer(base, { type: 'alternarSeleccion', dia: 1 })).toBe(base);
    const state = run(
      [
        { type: 'entrarSeleccion', dia: 1 },
        { type: 'alternarSeleccion', dia: 1 },
      ],
      base,
    );
    expect(state.seleccion).toEqual([]);
  });

  it('«Configurar juntos» copia lo elegido a todos los días marcados y sale del modo', () => {
    let state = withDays([1, 3, 4]);
    state = run(
      [
        { type: 'entrarSeleccion', dia: 1 },
        { type: 'alternarSeleccion', dia: 4 },
        { type: 'iniciarGrupo' },
        {
          type: 'agregarEjercicio',
          destino: 'grupo',
          ejercicio: exercise('a'),
        },
        {
          type: 'agregarEjercicio',
          destino: 'grupo',
          ejercicio: exercise('b'),
        },
        {
          type: 'agregarEjercicio',
          destino: 'grupo',
          ejercicio: exercise('c'),
        },
        { type: 'confirmarGrupo' },
      ],
      state,
    );
    const counts = Object.fromEntries(
      state.draft.dias.map((d) => [d.diaSemana, d.ejercicios.length]),
    );
    expect(counts).toEqual({ 1: 3, 3: 0, 4: 3 });
    expect(state.grupo).toBeNull();
    expect(state.seleccion).toBeNull();
  });

  it('después de configurar juntos cada día se edita por separado', () => {
    let state = withDays([1, 4]);
    state = run(
      [
        { type: 'entrarSeleccion', dia: 1 },
        { type: 'alternarSeleccion', dia: 4 },
        { type: 'iniciarGrupo' },
        {
          type: 'agregarEjercicio',
          destino: 'grupo',
          ejercicio: exercise('a'),
        },
        { type: 'confirmarGrupo' },
        { type: 'quitarEjercicio', destino: 1, ejercicioId: 'a' },
      ],
      state,
    );
    expect(state.draft.dias.map((d) => d.ejercicios.length)).toEqual([0, 1]);
  });

  it('no inicia el grupo si no hay días marcados, y cancelar lo descarta', () => {
    const base = withDays([1, 3]);
    expect(routineDraftReducer(base, { type: 'iniciarGrupo' }).grupo).toBeNull();
    const started = run([{ type: 'entrarSeleccion', dia: 1 }, { type: 'iniciarGrupo' }], base);
    expect(started.grupo?.dias).toEqual([1]);
    expect(routineDraftReducer(started, { type: 'cancelarGrupo' }).grupo).toBeNull();
  });

  it('desmarcar un día lo saca también de la selección', () => {
    const state = run(
      [
        { type: 'entrarSeleccion', dia: 1 },
        { type: 'alternarSeleccion', dia: 3 },
        { type: 'alternarDia', dia: 3 },
      ],
      withDays([1, 3]),
    );
    expect(state.seleccion).toEqual([1]);
  });

  it('duplicar un día no repite ejercicios que el destino ya tiene', () => {
    const state = run(
      [
        { type: 'agregarEjercicio', destino: 1, ejercicio: exercise('a') },
        { type: 'agregarEjercicio', destino: 3, ejercicio: exercise('a') },
        { type: 'agregarEjercicio', destino: 1, ejercicio: exercise('b') },
        { type: 'duplicarDia', desde: 1, hacia: [3] },
      ],
      withDays([1, 3]),
    );
    expect(state.draft.dias[1]?.ejercicios.map((e) => e.ejercicioId)).toEqual(['a', 'b']);
  });
});

describe('avisos de calidad (RF-08)', () => {
  it('un día sin ejercicios bloquea', () => {
    const report = evaluateQuality(withDays([1, 3]).draft);
    expect(report.bloqueos).toHaveLength(2);
    expect(report.bloqueos[0]?.mensaje).toMatch(/Hay un día sin ejercicios: Lunes/);
  });

  it('avisa si un grupo sólo se entrena un día, sin bloquear', () => {
    const state = run(
      [
        {
          type: 'agregarEjercicio',
          destino: 1,
          ejercicio: exercise('a', 'Pecho'),
        },
        {
          type: 'agregarEjercicio',
          destino: 1,
          ejercicio: exercise('b', 'Espalda'),
        },
        {
          type: 'agregarEjercicio',
          destino: 3,
          ejercicio: exercise('c', 'Espalda'),
        },
      ],
      withDays([1, 3]),
    );
    const report = evaluateQuality(state.draft);
    expect(report.bloqueos).toEqual([]);
    expect(report.avisos.map((a) => a.mensaje)).toEqual(['Pecho solo se entrena 1 vez por semana']);
  });

  it('con un solo día no avisa de frecuencia', () => {
    const state = run(
      [{ type: 'agregarEjercicio', destino: 1, ejercicio: exercise('a') }],
      withDays([1]),
    );
    expect(evaluateQuality(state.draft).avisos).toEqual([]);
  });

  it('avisa si un día pasa de 30 series', () => {
    const state = run(
      Array.from({ length: 11 }, (_, i) => ({
        type: 'agregarEjercicio' as const,
        destino: 1 as const,
        ejercicio: exercise(`e${i}`, `G${i}`, 3),
      })),
      withDays([1]),
    );
    expect(evaluateQuality(state.draft).avisos[0]?.codigo).toBe('MUCHAS_SERIES');
  });
});

describe('semanas y descarga (RF-08)', () => {
  const twelveWeeks = () =>
    run([{ type: 'duracion', duracion: { unidad: 'meses', cantidad: 3 } }]).draft;

  it('con descarga cada 4, las semanas 4, 8 y 12 son descarga', () => {
    const deloads = planWeeks(twelveWeeks())
      .filter((w) => w.esDescarga)
      .map((w) => w.numero);
    expect(deloads).toEqual([4, 8, 12]);
  });

  it('con descarga cada 5 se refleja en la revisión', () => {
    const draft = {
      ...twelveWeeks(),
      progresion: { activa: true, descargaCada: 5 as const },
    };
    expect(
      planWeeks(draft)
        .filter((w) => w.esDescarga)
        .map((w) => w.numero),
    ).toEqual([5, 10]);
  });

  it('sin progresión o más corta que el ciclo no hay descarga', () => {
    const off = {
      ...twelveWeeks(),
      progresion: { activa: false, descargaCada: null },
    };
    expect(planWeeks(off).some((w) => w.esDescarga)).toBe(false);
    const short = {
      ...createEmptyDraft(),
      duracion: { unidad: 'semanas' as const, cantidad: 3 },
    };
    expect(planWeeks(short).some((w) => w.esDescarga)).toBe(false);
  });

  it('marcar S6 como descarga deja S5 normal y se manda como ajuste', () => {
    const base = twelveWeeks();
    const choice = toggledWeekChoice(base, 6);
    expect(choice).toBe('DESCARGA');
    const state = routineDraftReducer(
      { ...createInitialState(), draft: base },
      { type: 'ajustarSemana', numero: 6, eleccion: choice },
    );
    const weeks = planWeeks(state.draft);
    expect(weeks[5]).toMatchObject({ esDescarga: true, ajustada: true });
    expect(weeks[4]?.esDescarga).toBe(false);
    expect(toWeekOverrides(state.draft)).toEqual([
      {
        numero: 6,
        cuerpo: { esDescarga: true, factorVolumen: 0.5, factorCarga: 0.9 },
      },
    ]);
  });

  it('volver a tocar una semana la devuelve a la regla general y borra el ajuste', () => {
    const base = { ...twelveWeeks(), semanas: { '6': 'DESCARGA' as const } };
    expect(toggledWeekChoice(base, 6)).toBeNull();
    expect(toggledWeekChoice(base, 4)).toBe('NORMAL');
  });
});

describe('carga útil para el backend', () => {
  it('POST /routines lleva los días con ejercicios y la duración en semanas', () => {
    const state = run(
      [
        { type: 'campo', campo: 'nombre', valor: '  Empuje 4 días ' },
        { type: 'renombrarDia', dia: 1, nombre: 'Empuje' },
        { type: 'agregarEjercicio', destino: 1, ejercicio: exercise('a') },
      ],
      withDays([1]),
    );
    const input = toCreateInput(state.draft);
    expect(input).toMatchObject({
      nombre: 'Empuje 4 días',
      descripcion: null,
      visibilidad: 'PRIVATE',
      duracionSemanas: 12,
      progresion: { activa: true, descargaCada: 4 },
    });
    expect(input.dias).toEqual([
      {
        diaSemana: 1,
        nombre: 'Empuje',
        ejercicios: [
          {
            ejercicioId: 'a',
            seriesObjetivo: 3,
            repsMin: 8,
            repsMax: 12,
            pesoObjetivoKg: null,
            rirObjetivo: null,
            descansoSeg: 90,
            nota: null,
          },
        ],
      },
    ]);
    expect(toStructureInput(state.draft).dias).toEqual(input.dias);
  });

  it('sin progresión manda descargaCada null', () => {
    const draft = {
      ...createEmptyDraft(),
      progresion: { activa: false, descargaCada: 4 as const },
    };
    expect(toCreateInput(draft).progresion).toEqual({
      activa: false,
      descargaCada: null,
    });
  });
});

describe('mapeo de errores', () => {
  it('compara el code estable, no el texto', () => {
    const view = describeSaveError({
      message: 'cualquier texto',
      status: 400,
      code: 'ROUTINE_HAS_NO_DAYS',
    });
    expect(view.paso).toBe(4);
    expect(view.reintentable).toBe(false);
    expect(view.mensaje).toMatch(/al menos un ejercicio/);
  });

  it('la red caída es reintentable y recuerda que el borrador se conserva', () => {
    const view = describeSaveError({
      message: 'x',
      status: 0,
      kind: 'network',
    });
    expect(view.titulo).toBe('Sin conexión');
    expect(view.reintentable).toBe(true);
    expect(view.mensaje).toMatch(/borrador/);
  });

  it('distingue 400, 401, 403, 429 y lo inesperado', () => {
    expect(describeSaveError({ message: 'Nombre inválido', status: 400 })).toMatchObject({
      titulo: 'Revisa los datos',
      mensaje: 'Nombre inválido',
    });
    expect(describeSaveError({ message: 'x', status: 401 }).titulo).toBe('Sesión caducada');
    expect(describeSaveError({ message: 'x', status: 403 }).titulo).toBe('Sin permiso');
    expect(describeSaveError({ message: 'x', status: 429 }).reintentable).toBe(true);
    expect(describeSaveError({ message: 'boom', status: 500 }).mensaje).not.toMatch(/boom/);
  });

  it('un duplicado remite a la revisión', () => {
    expect(
      describeSaveError({
        message: 'x',
        status: 409,
        code: 'ROUTINE_DUPLICATE',
      }).paso,
    ).toBe(5);
  });
});

describe('persistencia del borrador', () => {
  it('serializa y recupera exactamente lo guardado', () => {
    const state = run(
      [
        { type: 'campo', campo: 'nombre', valor: 'QA' },
        { type: 'agregarEjercicio', destino: 1, ejercicio: exercise('a') },
      ],
      withDays([1]),
    );
    const parsed = parseDraft(serializeDraft(state.draft, 3));
    expect(parsed).toEqual({ draft: state.draft, paso: 3 });
  });

  it('descarta contenido corrupto, de otra versión o con datos inválidos sin lanzar', () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft('{no es json')).toBeNull();
    expect(parseDraft(JSON.stringify({ v: 99, paso: 0, draft: createEmptyDraft() }))).toBeNull();
    expect(parseDraft(JSON.stringify({ v: 1, paso: 0, draft: { nombre: 3 } }))).toBeNull();
  });

  it('un borrador en blanco no merece retomarse', () => {
    expect(hasContent(createEmptyDraft())).toBe(false);
    expect(hasContent({ ...createEmptyDraft(), nombre: 'Algo' })).toBe(true);
  });
});

describe('borrador retomado', () => {
  it('un borrador recuperado se ofrece hasta que se toca, y tocarlo apaga la oferta', () => {
    const restored = routineDraftReducer(createInitialState(), {
      type: 'hidratar',
      draft: { ...createEmptyDraft(), nombre: 'Antes' },
      paso: 2,
    });
    expect(restored).toMatchObject({ retomado: true, sucio: true, paso: 2 });
    expect(
      routineDraftReducer(restored, {
        type: 'campo',
        campo: 'nombre',
        valor: 'Ahora',
      }).retomado,
    ).toBe(false);
    expect(routineDraftReducer(restored, { type: 'reiniciar' }).retomado).toBe(false);
  });
});

describe('estado sucio y guardado', () => {
  it('editar marca el borrador como sucio y guardar guarda el id y lo limpia', () => {
    const state = run([{ type: 'campo', campo: 'nombre', valor: 'QA' }]);
    expect(state.sucio).toBe(true);
    const saved = routineDraftReducer(state, {
      type: 'guardado',
      routineId: 'r1',
    });
    expect(saved.sucio).toBe(false);
    expect(saved.draft.routineId).toBe('r1');
  });

  it('intentar un paso lo registra una sola vez', () => {
    const state = run([
      { type: 'intentar', paso: 0 },
      { type: 'intentar', paso: 0 },
    ]);
    expect(state.intentados).toEqual([0]);
  });
});

describe('zona muscular', () => {
  it('unifica el dataset en inglés y los ejercicios propios en mayúsculas', () => {
    expect(muscleZone({ grupoMuscular: 'triceps', bodyPart: 'chest' })).toBe('Pecho');
    expect(muscleZone({ grupoMuscular: 'PECHO', bodyPart: null })).toBe('Pecho');
    expect(muscleZone({ grupoMuscular: 'PIERNA' })).toBe('Piernas');
    expect(muscleZone({ grupoMuscular: 'glutes', bodyPart: 'upper legs' })).toBe('Piernas');
    expect(muscleZone({ grupoMuscular: 'otra cosa' })).toBe('Otra cosa');
  });

  it('el cardio no genera aviso de frecuencia', () => {
    const cardio = createDraftExercise(
      { id: 'c', nombre: 'Cinta', grupoMuscular: 'x', bodyPart: 'cardio' },
      null,
    );
    const state = run(
      [{ type: 'agregarEjercicio', destino: 1, ejercicio: cardio }],
      withDays([1, 3]),
    );
    expect(evaluateQuality(state.draft).avisos).toEqual([]);
  });
});

describe('guardado del borrador', () => {
  const routineStub = { id: 'r1' } as never;
  function services(overrides: Partial<RoutineSaveServices> = {}): RoutineSaveServices {
    return {
      createWithDays: vi.fn().mockResolvedValue(routineStub),
      replaceStructure: vi.fn().mockResolvedValue(routineStub),
      setWeek: vi.fn().mockResolvedValue({}),
      ...overrides,
    };
  }
  const filled = () =>
    run(
      [
        { type: 'campo', campo: 'nombre', valor: 'QA' },
        { type: 'agregarEjercicio', destino: 1, ejercicio: exercise('a') },
        { type: 'ajustarSemana', numero: 6, eleccion: 'DESCARGA' },
      ],
      withDays([1]),
    ).draft;

  it('crea con los días, avisa del id y envía los ajustes de semana', async () => {
    const api = services();
    const onCreated = vi.fn();
    const result = await saveRoutineDraft(api, filled(), onCreated);
    expect(api.createWithDays).toHaveBeenCalledOnce();
    expect(api.replaceStructure).not.toHaveBeenCalled();
    expect(onCreated).toHaveBeenCalledWith('r1');
    expect(api.setWeek).toHaveBeenCalledWith(
      'r1',
      6,
      expect.objectContaining({ esDescarga: true }),
    );
    expect(result.semanasFallidas).toEqual([]);
  });

  it('si ya hay id reemplaza la estructura en vez de crear otra rutina', async () => {
    const api = services();
    await saveRoutineDraft(api, { ...filled(), routineId: 'r9' });
    expect(api.createWithDays).not.toHaveBeenCalled();
    expect(api.replaceStructure).toHaveBeenCalledWith(
      'r9',
      expect.objectContaining({ dias: expect.any(Array) }),
    );
  });

  it('un ajuste de semana que falla no pierde la rutina ya creada', async () => {
    const api = services({
      setWeek: vi.fn().mockRejectedValue(new Error('x')),
    });
    const onCreated = vi.fn();
    const result = await saveRoutineDraft(api, filled(), onCreated);
    expect(onCreated).toHaveBeenCalledWith('r1');
    expect(result.semanasFallidas).toEqual([6]);
  });

  it('si crear falla, propaga el error y no avisa de ningún id', async () => {
    const api = services({
      createWithDays: vi.fn().mockRejectedValue(new Error('boom')),
    });
    const onCreated = vi.fn();
    await expect(saveRoutineDraft(api, filled(), onCreated)).rejects.toThrow('boom');
    expect(onCreated).not.toHaveBeenCalled();
  });
});
