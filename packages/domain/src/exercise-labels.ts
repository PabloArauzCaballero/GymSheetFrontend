/**
 * Etiquetas en español del vocabulario del catálogo de ejercicios.
 *
 * Es la única tabla de traducción de músculos, zonas y equipamiento del
 * frontend: web, móvil y `@gymsheet/hooks` (las zonas del borrador de rutina)
 * la consultan aquí para que el mismo ejercicio se nombre igual en todas partes.
 *
 * Cubre los tres orígenes que llegan del backend:
 *
 * - El dataset importado (snapshot de arranque y biblioteca 2026-10), en inglés
 *   y en minúsculas: `targetMuscle` («quads»), `secondaryMuscles`,
 *   `grupoMuscular` («hip flexors»), `bodyPart` («upper legs») y
 *   `requiredEquipment` («leverage machine»).
 * - La taxonomía de músculos (`muscle-taxonomy.ts` del backend), en códigos
 *   SCREAMING_CASE: `QUADRICEPS`, `PECTORALIS_MAJOR`, y sus grupos `LEGS`,
 *   `CORE`…
 * - Los enumerados del gimnasio, ya en español pero en mayúsculas: el
 *   `grupoMuscular` de los ejercicios propios («PECHO», «PIERNA») y el tipo de
 *   equipo (`MAQUINA`, `MANCUERNA`…).
 *
 * Las claves se normalizan (minúsculas, `_` y `-` como espacio), así que
 * `QUADRICEPS`, `quadriceps` y `Quadriceps` son la misma entrada. Lo que no
 * está en la tabla se humaniza —`NUEVO_MUSCULO` → «Nuevo musculo»— y nunca se
 * devuelve en mayúsculas sostenidas: un código nuevo se ve legible antes que
 * desaparecer o gritar.
 */

/** Músculos: dataset (inglés) + taxonomía (códigos). */
const MUSCLE_LABELS: Readonly<Record<string, string>> = {
  // Dataset: músculo objetivo, secundarios, sinergistas y grupo muscular.
  abs: 'Abdominales',
  abdominals: 'Abdominales',
  'lower abs': 'Abdomen inferior',
  pectorals: 'Pectorales',
  chest: 'Pecho',
  'upper chest': 'Pectoral superior',
  biceps: 'Bíceps',
  glutes: 'Glúteos',
  delts: 'Deltoides',
  deltoids: 'Deltoides',
  'rear deltoids': 'Deltoides posterior',
  shoulders: 'Hombros',
  triceps: 'Tríceps',
  back: 'Espalda',
  'upper back': 'Espalda alta',
  'lower back': 'Zona lumbar',
  lats: 'Dorsales',
  calves: 'Gemelos',
  quads: 'Cuádriceps',
  hamstrings: 'Isquiotibiales',
  adductors: 'Aductores',
  'inner thighs': 'Cara interna del muslo',
  groin: 'Ingle',
  abductors: 'Abductores de cadera',
  forearms: 'Antebrazos',
  'wrist flexors': 'Flexores de muñeca',
  'wrist extensors': 'Extensores de muñeca',
  wrists: 'Muñecas',
  hands: 'Manos',
  'grip muscles': 'Músculos del agarre',
  feet: 'Pies',
  ankles: 'Tobillos',
  'ankle stabilizers': 'Estabilizadores del tobillo',
  shins: 'Espinillas',
  traps: 'Trapecios',
  spine: 'Lumbares (erectores)',
  'cardiovascular system': 'Sistema cardiovascular',
  neck: 'Cuello',
  core: 'Core',

  // Taxonomía del backend (y de `@gymsheet/anatomy`): mismo nombre que allí.
  'pectoralis major': 'Pectoral mayor',
  'pectoralis minor': 'Pectoral menor',
  'serratus anterior': 'Serrato anterior',
  'latissimus dorsi': 'Dorsal ancho',
  trapezius: 'Trapecio',
  rhomboids: 'Romboides',
  'erector spinae': 'Erectores espinales',
  'teres major': 'Redondo mayor',
  infraspinatus: 'Infraespinoso',
  deltoid: 'Deltoides',
  'deltoid anterior': 'Deltoides anterior',
  'deltoid lateral': 'Deltoides lateral',
  'deltoid posterior': 'Deltoides posterior',
  'rotator cuff': 'Manguito rotador',
  'levator scapulae': 'Elevador de la escápula',
  'biceps brachii': 'Bíceps braquial',
  brachialis: 'Braquial anterior',
  brachioradialis: 'Braquiorradial',
  'triceps brachii': 'Tríceps braquial',
  'forearm flexors': 'Flexores del antebrazo',
  'forearm extensors': 'Extensores del antebrazo',
  'rectus abdominis': 'Recto abdominal',
  obliques: 'Oblicuos',
  'transverse abdominis': 'Transverso abdominal',
  'hip flexors': 'Flexores de cadera',
  quadriceps: 'Cuádriceps',
  'tibialis anterior': 'Tibial anterior',
  'gluteus maximus': 'Glúteo mayor',
  'gluteus medius': 'Glúteo medio',
  gastrocnemius: 'Gastrocnemio',
  soleus: 'Sóleo',
  sternocleidomastoid: 'Esternocleidomastoideo',
  cardiovascular: 'Sistema cardiovascular',
};

/**
 * Zonas del cuerpo: `bodyPart` del dataset, grupos de la taxonomía y el
 * `grupoMuscular` en español de los ejercicios propios. Todas las variantes de
 * una zona dan la MISMA etiqueta: los avisos de frecuencia de la rutina cuentan
 * por esta etiqueta, y «PIERNA» y «upper legs» tienen que sumar en «Piernas».
 */
const ZONE_LABELS: Readonly<Record<string, string>> = {
  // Dataset (`bodyPart`).
  back: 'Espalda',
  cardio: 'Cardio',
  chest: 'Pecho',
  'lower arms': 'Antebrazos',
  'lower legs': 'Pantorrillas',
  neck: 'Cuello',
  shoulders: 'Hombros',
  'upper arms': 'Brazos',
  'upper legs': 'Piernas',
  waist: 'Abdomen',
  // Grupos de la taxonomía (`CHEST`, `LEGS`… los que no repiten los de arriba).
  arms: 'Brazos',
  core: 'Abdomen',
  legs: 'Piernas',
  glutes: 'Glúteos',
  calves: 'Pantorrillas',
  // `grupoMuscular` en español (ejercicios propios y gimnasio).
  pecho: 'Pecho',
  espalda: 'Espalda',
  hombro: 'Hombros',
  hombros: 'Hombros',
  brazo: 'Brazos',
  brazos: 'Brazos',
  antebrazo: 'Antebrazos',
  antebrazos: 'Antebrazos',
  pierna: 'Piernas',
  piernas: 'Piernas',
  pantorrilla: 'Pantorrillas',
  pantorrillas: 'Pantorrillas',
  gluteo: 'Glúteos',
  gluteos: 'Glúteos',
  glúteo: 'Glúteos',
  glúteos: 'Glúteos',
  abdomen: 'Abdomen',
  abdominales: 'Abdomen',
  cuello: 'Cuello',
};

/** Equipamiento: `requiredEquipment` del dataset y el enumerado `EquipmentType`. */
const EQUIPMENT_LABELS: Readonly<Record<string, string>> = {
  // Dataset (`requiredEquipment`).
  'agility ladder': 'Escalera de agilidad',
  assisted: 'Asistido',
  band: 'Banda elástica',
  barbell: 'Barra',
  bench: 'Banco',
  'body weight': 'Peso corporal',
  'bosu ball': 'Bosu',
  box: 'Cajón',
  cable: 'Polea',
  chair: 'Silla',
  dumbbell: 'Mancuerna',
  'elliptical machine': 'Elíptica',
  'ez barbell': 'Barra Z',
  gymstick: 'Bastón elástico',
  hammer: 'Mazo',
  kettlebell: 'Pesa rusa',
  'leverage machine': 'Máquina de palanca',
  'medicine ball': 'Balón medicinal',
  'olympic barbell': 'Barra olímpica',
  'pvc pipe': 'Tubo de PVC',
  'reaction ball': 'Pelota de reacción',
  'resistance band': 'Banda de resistencia',
  roller: 'Rodillo',
  rope: 'Cuerda',
  'skierg machine': 'Ergómetro de esquí',
  'sled machine': 'Trineo',
  'smith machine': 'Máquina Smith',
  'stability ball': 'Fitball',
  'stationary bike': 'Bicicleta estática',
  step: 'Step',
  'stepmill machine': 'Escaladora',
  tire: 'Neumático',
  towel: 'Toalla',
  'trap bar': 'Barra hexagonal',
  'upper body ergometer': 'Ergómetro de brazos',
  wall: 'Pared',
  'water bottle': 'Botella de agua',
  weighted: 'Con lastre',
  'wheel roller': 'Rueda abdominal',
  // Enumerado `EquipmentType` del backend (valores en español, mayúsculas).
  maquina: 'Máquina',
  mancuerna: 'Mancuerna',
  barra: 'Barra',
  disco: 'Disco',
  banco: 'Banco',
  polea: 'Polea',
  banda: 'Banda elástica',
  accesorio: 'Accesorio',
  otro: 'Otro',
};

/** `QUADRICEPS`, ` Upper_Legs ` y `upper-legs` comparten clave. */
export function vocabularyKey(code: string | null | undefined): string {
  return (code ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Un código sin traducción, legible: guiones bajos como espacios, mayúsculas
 * sostenidas a minúsculas y la inicial en mayúscula. Respeta lo que ya viene
 * escrito con mayúsculas y minúsculas («Tren superior», «Bíceps braquial»).
 */
export function humanizeCode(code: string | null | undefined): string {
  const spaced = (code ?? '').trim().replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!spaced) return '';
  const shouting = spaced === spaced.toUpperCase() && spaced !== spaced.toLowerCase();
  const text = shouting ? spaced.toLowerCase() : spaced;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function lookup(code: string | null | undefined, ...tables: Readonly<Record<string, string>>[]): string {
  const key = vocabularyKey(code);
  if (!key) return '';
  for (const table of tables) {
    const label = table[key];
    if (label) return label;
  }
  return humanizeCode(code);
}

/**
 * Un músculo: `pectorals` → «Pectorales», `QUADRICEPS` → «Cuádriceps». Si no
 * es un músculo pero sí una zona (`LEGS`, «PECHO») da la zona; si no es nada
 * conocido, el código humanizado. Vacío → `''`.
 */
export function muscleLabelEs(code: string | null | undefined): string {
  return lookup(code, MUSCLE_LABELS, ZONE_LABELS);
}

/**
 * Una zona del cuerpo: `upper legs` → «Piernas», `CORE` → «Abdomen». Prueba
 * después la tabla de músculos y, si tampoco está, humaniza. Vacío → `''`.
 */
export function bodyPartLabelEs(code: string | null | undefined): string {
  return lookup(code, ZONE_LABELS, MUSCLE_LABELS);
}

/** Alias de {@link bodyPartLabelEs} con el nombre del concepto de rutina. */
export const zoneLabelEs = bodyPartLabelEs;

/**
 * Para `grupoMuscular`, que según el origen trae un músculo («pectorals»), una
 * zona («upper legs»), un código («QUADRICEPS») o ya un nombre en español
 * («Pecho»): músculo primero, luego zona, luego el texto humanizado.
 */
export function exerciseGroupLabelEs(value: string | null | undefined): string {
  return lookup(value, MUSCLE_LABELS, ZONE_LABELS);
}

/** Equipamiento: `leverage machine` → «Máquina de palanca», `MAQUINA` → «Máquina». */
export function equipmentLabelEs(code: string | null | undefined): string {
  return lookup(code, EQUIPMENT_LABELS);
}

/**
 * Zona muscular de un ejercicio, unificada: el catálogo trae `bodyPart` en
 * inglés (dataset) o `grupoMuscular` en mayúsculas (ejercicios propios), y los
 * avisos de frecuencia de la rutina tienen que contar «Pecho» una sola vez.
 */
export function muscleZone(exercise: { grupoMuscular: string; bodyPart?: string | null }): string {
  return zoneLabelEs(exercise.bodyPart?.trim() ? exercise.bodyPart : exercise.grupoMuscular);
}

/** Las tablas, para pruebas y para quien necesite recorrer el vocabulario. */
export const EXERCISE_MUSCLE_LABELS_ES = MUSCLE_LABELS;
export const EXERCISE_BODY_PART_LABELS_ES = ZONE_LABELS;
export const EXERCISE_EQUIPMENT_LABELS_ES = EQUIPMENT_LABELS;
