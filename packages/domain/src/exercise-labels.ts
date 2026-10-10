/**
 * Etiquetas en español del vocabulario del catálogo de ejercicios.
 *
 * El dataset importado guarda el músculo principal (`targetMuscle`), los
 * secundarios y la zona (`bodyPart`) en inglés y en minúsculas («upper legs»,
 * «pectorals»). La app habla español, así que la traducción vive aquí, en
 * `domain`, para que web y móvil digan lo mismo del mismo ejercicio.
 *
 * Los valores que ya vienen en español (los `grupoMuscular` que define el
 * gimnasio, como «Pecho» o «Tren superior») y cualquier término que no esté en
 * la tabla se devuelven tal cual con la inicial en mayúscula: un músculo nuevo
 * en el catálogo se ve en inglés antes que desaparecer.
 */

const MUSCLE_LABELS: Readonly<Record<string, string>> = {
  abs: 'Abdominales',
  pectorals: 'Pectorales',
  biceps: 'Bíceps',
  glutes: 'Glúteos',
  delts: 'Deltoides',
  triceps: 'Tríceps',
  'upper back': 'Espalda alta',
  lats: 'Dorsales',
  calves: 'Gemelos',
  quads: 'Cuádriceps',
  hamstrings: 'Isquiotibiales',
  adductors: 'Aductores',
  abductors: 'Abductores',
  forearms: 'Antebrazos',
  traps: 'Trapecios',
  'serratus anterior': 'Serrato anterior',
  spine: 'Lumbares (erectores)',
  'levator scapulae': 'Elevador de la escápula',
  'cardiovascular system': 'Sistema cardiovascular',
  neck: 'Cuello',
};

const BODY_PART_LABELS: Readonly<Record<string, string>> = {
  back: 'Espalda',
  cardio: 'Cardio',
  chest: 'Pecho',
  'lower arms': 'Antebrazos',
  'lower legs': 'Pantorrillas',
  neck: 'Cuello',
  shoulders: 'Hombros',
  'upper arms': 'Brazos',
  'upper legs': 'Muslos',
  waist: 'Cintura',
};

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function lookup(table: Readonly<Record<string, string>>, code: string | null | undefined): string {
  const trimmed = (code ?? '').trim();
  if (!trimmed) return '';
  return table[trimmed.toLowerCase().replace(/\s+/g, ' ')] ?? capitalise(trimmed);
}

/** `pectorals` → `Pectorales`. Desconocido → el mismo texto con inicial mayúscula; vacío → `''`. */
export function muscleLabelEs(code: string | null | undefined): string {
  return lookup(MUSCLE_LABELS, code);
}

/** `upper legs` → `Muslos`. Desconocido → el mismo texto con inicial mayúscula; vacío → `''`. */
export function bodyPartLabelEs(code: string | null | undefined): string {
  return lookup(BODY_PART_LABELS, code);
}

/**
 * Para `grupoMuscular`, que según el origen trae un músculo («pectorals»), una
 * zona («upper legs») o ya un nombre en español («Pecho»): prueba las dos tablas
 * y, si ninguna lo conoce, lo devuelve tal cual con la inicial en mayúscula.
 */
export function exerciseGroupLabelEs(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '';
  const key = trimmed.toLowerCase().replace(/\s+/g, ' ');
  return MUSCLE_LABELS[key] ?? BODY_PART_LABELS[key] ?? capitalise(trimmed);
}

/** Las tablas, para pruebas y para quien necesite recorrer el vocabulario. */
export const EXERCISE_MUSCLE_LABELS_ES = MUSCLE_LABELS;
export const EXERCISE_BODY_PART_LABELS_ES = BODY_PART_LABELS;
