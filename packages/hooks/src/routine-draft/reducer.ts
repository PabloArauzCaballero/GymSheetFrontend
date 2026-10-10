import type { TrainingGoal } from '@gymsheet/types';
import {
  clampDuration,
  joinGroup,
  newDraftUid,
  normalizeGroups,
  setGroupRest,
  splitGroup,
} from './groups';
import {
  createEmptyDraft,
  defaultsForGoal,
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
  /** El borrador viene de una visita anterior y todavía no se ha tocado: se ofrece retomarlo. */
  retomado: boolean;
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
  /**
   * Quita una fila por su `uid`. Con `ejercicioId` (el interruptor «añadido» del
   * buscador) quita todas las filas de ese ejercicio.
   */
  | { type: 'quitarEjercicio'; destino: DayTarget; uid: string }
  | { type: 'quitarEjercicio'; destino: DayTarget; ejercicioId: string }
  | { type: 'moverEjercicio'; destino: DayTarget; desde: number; hacia: number }
  | {
      type: 'editarEjercicio';
      destino: DayTarget;
      uid: string;
      cambios: Partial<Omit<DraftExercise, 'uid'>>;
    }
  /** Une en una superserie (2) o circuito (3+) filas contiguas (C3.d). */
  | { type: 'unirEnGrupo'; destino: DayTarget; uids: string[] }
  | { type: 'separarGrupo'; destino: DayTarget; grupo: number }
  /** Transición entre los ejercicios del bloque, 0–60 s. */
  | { type: 'setDescansoEntre'; destino: DayTarget; grupo: number; descansoEntreSeg: number }
  /** Serie por tiempo (`duracionSeg` en s) o vuelta a repeticiones (`null`). */
  | { type: 'setPorTiempo'; destino: DayTarget; uid: string; duracionSeg: number | null }
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
    retomado: false,
  };
}

function sortDays(days: RoutineDraft['dias']): RoutineDraft['dias'] {
  return [...days].sort((a, b) => a.diaSemana - b.diaSemana);
}

function withDraft(state: WizardState, draft: RoutineDraft): WizardState {
  return { ...state, draft, sucio: true, retomado: false };
}

/**
 * Aplica un cambio a la lista de un día (o del borrador de «Configurar
 * juntos») y deja sus bloques coherentes. Si el cambio devuelve `null` (no
 * aplicable), el estado no cambia.
 */
function updateList(
  state: WizardState,
  destino: DayTarget,
  apply: (list: DraftExercise[]) => DraftExercise[] | null,
): WizardState {
  if (destino === 'grupo') {
    if (!state.grupo) return state;
    const next = apply([...state.grupo.ejercicios]);
    if (next === null) return state;
    return { ...state, grupo: { ...state.grupo, ejercicios: normalizeGroups(next) } };
  }
  const day = findDay(state.draft, destino);
  if (!day) return state;
  const next = apply([...day.ejercicios]);
  if (next === null) return state;
  const ejercicios = normalizeGroups(next);
  return withDraft(state, {
    ...state.draft,
    dias: state.draft.dias.map((item) =>
      item.diaSemana === destino ? { ...item, ejercicios } : item,
    ),
  });
}

/** Una fila nueva con otra clave local; su `grupo` lo decide quien la copia. */
function cloneRow(exercise: DraftExercise, grupo: number | null): DraftExercise {
  return { ...exercise, uid: newDraftUid(), grupo };
}

/**
 * Copia filas a otro día (duplicar, «Configurar juntos»). Un ejercicio suelto
 * que el destino ya tiene suelto no se repite; un bloque se copia entero, con
 * número propio para no mezclarse con los del destino. Cada copia lleva su
 * `uid` nuevo.
 */
function appendCopies(
  list: readonly DraftExercise[],
  extra: readonly DraftExercise[],
): DraftExercise[] {
  const looseInTarget = new Set(
    list.filter((exercise) => exercise.grupo === null).map((exercise) => exercise.ejercicioId),
  );
  let next = Math.max(0, ...list.map((exercise) => exercise.grupo ?? 0));
  const remap = new Map<number, number>();
  const copies: DraftExercise[] = [];
  for (const exercise of extra) {
    if (exercise.grupo === null) {
      if (looseInTarget.has(exercise.ejercicioId)) continue;
      looseInTarget.add(exercise.ejercicioId);
      copies.push(cloneRow(exercise, null));
      continue;
    }
    let grupo = remap.get(exercise.grupo);
    if (grupo === undefined) {
      next += 1;
      grupo = next;
      remap.set(exercise.grupo, grupo);
    }
    copies.push(cloneRow(exercise, grupo));
  }
  return normalizeGroups([...list, ...copies]);
}

/** Añade una fila; si su `uid` ya está en la lista (el mismo objeto dos veces), se le da otro. */
function appendRow(list: readonly DraftExercise[], exercise: DraftExercise): DraftExercise[] {
  const taken = list.some((item) => item.uid === exercise.uid);
  return [...list, taken ? { ...exercise, uid: newDraftUid() } : exercise];
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
      return {
        ...createInitialState(),
        draft: action.draft,
        paso: action.paso,
        sucio: true,
        retomado: true,
      };
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
            ? {
                ...day,
                ejercicios: appendCopies(day.ejercicios, source.ejercicios),
              }
            : day,
        ),
      });
    }
    case 'agregarEjercicio':
      return updateList(state, action.destino, (list) => appendRow(list, action.ejercicio));
    case 'quitarEjercicio':
      return updateList(state, action.destino, (list) =>
        'uid' in action
          ? list.filter((exercise) => exercise.uid !== action.uid)
          : list.filter((exercise) => exercise.ejercicioId !== action.ejercicioId),
      );
    case 'moverEjercicio':
      return updateList(state, action.destino, (list) => move(list, action.desde, action.hacia));
    case 'editarEjercicio':
      return updateList(state, action.destino, (list) =>
        list.map((exercise) =>
          exercise.uid === action.uid
            ? { ...exercise, ...action.cambios, uid: exercise.uid }
            : exercise,
        ),
      );
    case 'unirEnGrupo':
      return updateList(state, action.destino, (list) => joinGroup(list, action.uids));
    case 'separarGrupo':
      return updateList(state, action.destino, (list) =>
        list.some((exercise) => exercise.grupo === action.grupo)
          ? splitGroup(list, action.grupo)
          : null,
      );
    case 'setDescansoEntre':
      return updateList(state, action.destino, (list) =>
        list.some((exercise) => exercise.grupo === action.grupo)
          ? setGroupRest(list, action.grupo, action.descansoEntreSeg)
          : null,
      );
    case 'setPorTiempo': {
      const defaults = defaultsForGoal(draft.objetivo);
      return updateList(state, action.destino, (list) => {
        if (!list.some((exercise) => exercise.uid === action.uid)) return null;
        return list.map((exercise) => {
          if (exercise.uid !== action.uid) return exercise;
          if (action.duracionSeg === null) {
            return {
              ...exercise,
              duracionSeg: null,
              repsMin: exercise.repsMin ?? defaults.repsMin,
              repsMax: exercise.repsMax ?? defaults.repsMax,
            };
          }
          return {
            ...exercise,
            duracionSeg: clampDuration(action.duracionSeg),
            repsMin: null,
            repsMax: null,
          };
        });
      });
    }
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
      const dias = sortDays(draft.dias.filter((day) => state.seleccion?.includes(day.diaSemana)));
      if (dias.length === 0) return state;
      return {
        ...state,
        grupo: { dias: dias.map((day) => day.diaSemana), ejercicios: [] },
      };
    }
    case 'confirmarGrupo': {
      const group = state.grupo;
      if (!group) return state;
      return {
        ...withDraft(state, {
          ...draft,
          dias: draft.dias.map((day) =>
            group.dias.includes(day.diaSemana)
              ? {
                  ...day,
                  ejercicios: appendCopies(day.ejercicios, group.ejercicios),
                }
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
      return {
        ...state,
        draft: { ...draft, routineId: action.routineId },
        sucio: false,
      };
    default:
      return state;
  }
}
