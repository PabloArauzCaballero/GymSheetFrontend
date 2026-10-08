import type { TrainingGoal } from '@gymsheet/types';
import {
  createEmptyDraft,
  findDay,
  type DayTarget,
  type DraftDuration,
  type DraftExercise,
  type DraftProgression,
  type GroupDraft,
  type RoutineDraft,
  type WeekChoice,
  type Weekday,
} from './model';

/** Estado completo del asistente: el borrador (persistente) y lo que sólo vive en pantalla. */
export type WizardState = {
  draft: RoutineDraft;
  /** Paso actual, base 0 sobre `WIZARD_STEPS`. */
  paso: number;
  /** Modo selección múltiple de la tira de semana (RF-05). `null` = apagado. */
  seleccion: Weekday[] | null;
  /** Borrador de «Configurar juntos»: ejercicios que se copiarán a varios días. */
  grupo: GroupDraft | null;
  /** Pasos en los que ya se intentó avanzar: los errores sólo se enseñan entonces. */
  intentados: number[];
  /** Hay cambios respecto de lo último guardado o abierto («¿Salir sin guardar?»). */
  sucio: boolean;
};

export type WizardAction =
  | { type: 'hidratar'; draft: RoutineDraft; paso: number }
  | { type: 'reiniciar' }
  | { type: 'campo'; campo: 'nombre' | 'descripcion'; valor: string }
  | { type: 'objetivo'; objetivo: TrainingGoal | null }
  | { type: 'duracion'; duracion: DraftDuration }
  | { type: 'progresion'; progresion: DraftProgression }
  | { type: 'ir'; paso: number }
  | { type: 'intentar'; paso: number }
  | { type: 'alternarDia'; dia: Weekday }
  | { type: 'renombrarDia'; dia: Weekday; nombre: string }
  | { type: 'vaciarDia'; dia: Weekday }
  | { type: 'duplicarDia'; desde: Weekday; hacia: Weekday[] }
  | { type: 'agregarEjercicio'; destino: DayTarget; ejercicio: DraftExercise }
  | { type: 'quitarEjercicio'; destino: DayTarget; ejercicioId: string }
  | { type: 'moverEjercicio'; destino: DayTarget; desde: number; hacia: number }
  | {
      type: 'editarEjercicio';
      destino: DayTarget;
      ejercicioId: string;
      cambios: Partial<DraftExercise>;
    }
  | { type: 'entrarSeleccion'; dia?: Weekday }
  | { type: 'alternarSeleccion'; dia: Weekday }
  | { type: 'salirSeleccion' }
  | { type: 'iniciarGrupo' }
  | { type: 'confirmarGrupo' }
  | { type: 'cancelarGrupo' }
  | { type: 'ajustarSemana'; numero: number; eleccion: WeekChoice | null }
  | { type: 'guardado'; routineId: string };

export function createInitialState(): WizardState {
  return {
    draft: createEmptyDraft(),
    paso: 0,
    seleccion: null,
    grupo: null,
    intentados: [],
    sucio: false,
  };
}

function sortDays(days: RoutineDraft['dias']): RoutineDraft['dias'] {
  return [...days].sort((a, b) => a.diaSemana - b.diaSemana);
}

function withDraft(state: WizardState, draft: RoutineDraft): WizardState {
  return { ...state, draft, sucio: true };
}

function updateList(
  state: WizardState,
  destino: DayTarget,
  change: (list: DraftExercise[]) => DraftExercise[],
): WizardState {
  if (destino === 'grupo') {
    if (!state.grupo) return state;
    return { ...state, grupo: { ...state.grupo, ejercicios: change(state.grupo.ejercicios) } };
  }
  if (!findDay(state.draft, destino)) return state;
  return withDraft(state, {
    ...state.draft,
    dias: state.draft.dias.map((day) =>
      day.diaSemana === destino ? { ...day, ejercicios: change(day.ejercicios) } : day,
    ),
  });
}

function appendUnique(
  list: readonly DraftExercise[],
  extra: readonly DraftExercise[],
): DraftExercise[] {
  const seen = new Set(list.map((exercise) => exercise.ejercicioId));
  return [...list, ...extra.filter((exercise) => !seen.has(exercise.ejercicioId))];
}

function move<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return [...list];
  }
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  if (item === undefined) return copy;
  copy.splice(to, 0, item);
  return copy;
}

export function routineDraftReducer(state: WizardState, action: WizardAction): WizardState {
  const { draft } = state;
  switch (action.type) {
    case 'hidratar':
      // Un borrador recuperado sigue sin estar guardado en el servidor: cuenta como sucio.
      return { ...createInitialState(), draft: action.draft, paso: action.paso, sucio: true };
    case 'reiniciar':
      return createInitialState();
    case 'campo':
      return withDraft(state, { ...draft, [action.campo]: action.valor });
    case 'objetivo':
      // La progresión automática arranca encendida en Hipertrofia y Fuerza (D5);
      // en el resto de objetivos queda apagada hasta que la persona la pida.
      return withDraft(state, {
        ...draft,
        objetivo: action.objetivo,
        progresion: {
          ...draft.progresion,
          activa:
            action.objetivo === null ||
            action.objetivo === 'HIPERTROFIA' ||
            action.objetivo === 'FUERZA',
        },
      });
    case 'duracion':
      return withDraft(state, { ...draft, duracion: action.duracion });
    case 'progresion':
      return withDraft(state, { ...draft, progresion: action.progresion });
    case 'ir':
      return { ...state, paso: action.paso };
    case 'intentar':
      return state.intentados.includes(action.paso)
        ? state
        : { ...state, intentados: [...state.intentados, action.paso] };
    case 'alternarDia': {
      const exists = findDay(draft, action.dia);
      const dias = exists
        ? draft.dias.filter((day) => day.diaSemana !== action.dia)
        : sortDays([...draft.dias, { diaSemana: action.dia, nombre: '', ejercicios: [] }]);
      const seleccion = state.seleccion?.filter((dia) => dia !== action.dia) ?? null;
      return {
        ...withDraft(state, { ...draft, dias }),
        seleccion: seleccion && seleccion.length > 0 ? seleccion : null,
      };
    }
    case 'renombrarDia':
      return withDraft(state, {
        ...draft,
        dias: draft.dias.map((day) =>
          day.diaSemana === action.dia ? { ...day, nombre: action.nombre.slice(0, 60) } : day,
        ),
      });
    case 'vaciarDia':
      return updateList(state, action.dia, () => []);
    case 'duplicarDia': {
      const source = findDay(draft, action.desde);
      if (!source) return state;
      return withDraft(state, {
        ...draft,
        dias: draft.dias.map((day) =>
          action.hacia.includes(day.diaSemana) && day.diaSemana !== action.desde
            ? { ...day, ejercicios: appendUnique(day.ejercicios, source.ejercicios) }
            : day,
        ),
      });
    }
    case 'agregarEjercicio':
      return updateList(state, action.destino, (list) => appendUnique(list, [action.ejercicio]));
    case 'quitarEjercicio':
      return updateList(state, action.destino, (list) =>
        list.filter((exercise) => exercise.ejercicioId !== action.ejercicioId),
      );
    case 'moverEjercicio':
      return updateList(state, action.destino, (list) => move(list, action.desde, action.hacia));
    case 'editarEjercicio':
      return updateList(state, action.destino, (list) =>
        list.map((exercise) =>
          exercise.ejercicioId === action.ejercicioId
            ? { ...exercise, ...action.cambios }
            : exercise,
        ),
      );
    case 'entrarSeleccion':
      return { ...state, seleccion: action.dia ? [action.dia] : [] };
    case 'alternarSeleccion': {
      if (!state.seleccion) return state;
      const next = state.seleccion.includes(action.dia)
        ? state.seleccion.filter((dia) => dia !== action.dia)
        : [...state.seleccion, action.dia];
      return { ...state, seleccion: next };
    }
    case 'salirSeleccion':
      return { ...state, seleccion: null };
    case 'iniciarGrupo': {
      const dias = sortDays(
        draft.dias.filter((day) => state.seleccion?.includes(day.diaSemana)),
      );
      if (dias.length === 0) return state;
      return { ...state, grupo: { dias: dias.map((day) => day.diaSemana), ejercicios: [] } };
    }
    case 'confirmarGrupo': {
      const group = state.grupo;
      if (!group) return state;
      return {
        ...withDraft(state, {
          ...draft,
          dias: draft.dias.map((day) =>
            group.dias.includes(day.diaSemana)
              ? { ...day, ejercicios: appendUnique(day.ejercicios, group.ejercicios) }
              : day,
          ),
        }),
        grupo: null,
        seleccion: null,
      };
    }
    case 'cancelarGrupo':
      return { ...state, grupo: null };
    case 'ajustarSemana': {
      const semanas = { ...draft.semanas };
      if (action.eleccion === null) delete semanas[String(action.numero)];
      else semanas[String(action.numero)] = action.eleccion;
      return withDraft(state, { ...draft, semanas });
    }
    case 'guardado':
      return { ...state, draft: { ...draft, routineId: action.routineId }, sucio: false };
    default:
      return state;
  }
}
