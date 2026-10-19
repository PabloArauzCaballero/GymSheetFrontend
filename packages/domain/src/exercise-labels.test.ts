import { describe, expect, it } from 'vitest';
import { MUSCLES, musclesByGroup } from '@gymsheet/anatomy';
import {
  EXERCISE_BODY_PART_LABELS_ES,
  EXERCISE_EQUIPMENT_LABELS_ES,
  EXERCISE_MUSCLE_LABELS_ES,
  bodyPartLabelEs,
  equipmentLabelEs,
  exerciseGroupLabelEs,
  humanizeCode,
  muscleLabelEs,
  muscleZone,
  vocabularyKey,
  zoneLabelEs,
} from './exercise-labels';

/**
 * El vocabulario que existe hoy en el backend (GymSheetBackend, 2026-10):
 * valores distintos de `src/database/seeders/boot/exercises.snapshot.json.gz`
 * (1.324 ejercicios) y de `data/exercise-library/biblioteca-2026-10.json`
 * (379 entradas), más la taxonomía `muscle-taxonomy.ts` y el enumerado
 * `EquipmentType`. Si el catálogo trae un término nuevo, se añade aquí y a la
 * tabla: la prueba de cobertura falla hasta que tenga etiqueta.
 */
const DATASET_MUSCLES = [
  // target_muscle
  'abductors', 'abs', 'adductors', 'biceps', 'calves', 'cardiovascular system', 'delts', 'forearms',
  'glutes', 'hamstrings', 'lats', 'levator scapulae', 'pectorals', 'quads', 'serratus anterior', 'spine',
  'traps', 'triceps', 'upper back',
  // grupo_muscular / synergist_muscle_group / secondary_muscles / muscleGroup
  'abdominals', 'ankle stabilizers', 'ankles', 'back', 'brachialis', 'brachioradialis', 'chest', 'core',
  'deltoids', 'feet', 'grip muscles', 'groin', 'hands', 'hip flexors', 'inner thighs', 'latissimus dorsi',
  'lower abs', 'lower back', 'neck', 'obliques', 'quadriceps', 'rear deltoids', 'rhomboids', 'rotator cuff',
  'shins', 'shoulders', 'soleus', 'sternocleidomastoid', 'tibialis anterior', 'trapezius', 'upper chest',
  'wrist extensors', 'wrist flexors', 'wrists',
] as const;

const TAXONOMY_MUSCLES = [
  'PECTORALIS_MAJOR', 'PECTORALIS_MINOR', 'SERRATUS_ANTERIOR', 'LATISSIMUS_DORSI', 'TRAPEZIUS', 'RHOMBOIDS',
  'ERECTOR_SPINAE', 'TERES_MAJOR', 'INFRASPINATUS', 'DELTOID', 'DELTOID_ANTERIOR', 'DELTOID_LATERAL',
  'DELTOID_POSTERIOR', 'ROTATOR_CUFF', 'LEVATOR_SCAPULAE', 'BICEPS_BRACHII', 'BRACHIALIS', 'BRACHIORADIALIS',
  'TRICEPS_BRACHII', 'FOREARM_FLEXORS', 'FOREARM_EXTENSORS', 'RECTUS_ABDOMINIS', 'OBLIQUES',
  'TRANSVERSE_ABDOMINIS', 'HIP_FLEXORS', 'QUADRICEPS', 'HAMSTRINGS', 'ADDUCTORS', 'ABDUCTORS',
  'TIBIALIS_ANTERIOR', 'GLUTEUS_MAXIMUS', 'GLUTEUS_MEDIUS', 'GASTROCNEMIUS', 'SOLEUS', 'STERNOCLEIDOMASTOID',
  'CARDIOVASCULAR',
] as const;

const ZONES = [
  // body_part / category
  'back', 'cardio', 'chest', 'lower arms', 'lower legs', 'neck', 'shoulders', 'upper arms', 'upper legs', 'waist',
  // grupos de la taxonomía
  'CHEST', 'BACK', 'SHOULDERS', 'ARMS', 'CORE', 'LEGS', 'GLUTES', 'CALVES', 'NECK', 'CARDIO',
  // grupoMuscular del gimnasio
  'PECHO', 'ESPALDA', 'HOMBRO', 'HOMBROS', 'BRAZO', 'BRAZOS', 'PIERNA', 'PIERNAS', 'GLUTEOS', 'ABDOMEN',
] as const;

const EQUIPMENT = [
  // required_equipment / requiredEquipment
  'agility ladder', 'assisted', 'band', 'barbell', 'bench', 'body weight', 'bosu ball', 'box', 'cable', 'chair',
  'dumbbell', 'elliptical machine', 'ez barbell', 'gymstick', 'hammer', 'kettlebell', 'leverage machine',
  'medicine ball', 'olympic barbell', 'pvc pipe', 'reaction ball', 'resistance band', 'roller', 'rope',
  'skierg machine', 'sled machine', 'smith machine', 'stability ball', 'stationary bike', 'step',
  'stepmill machine', 'tire', 'towel', 'trap bar', 'upper body ergometer', 'wall', 'water bottle', 'weighted',
  'wheel roller',
  // EquipmentType
  'MAQUINA', 'MANCUERNA', 'BARRA', 'DISCO', 'BANCO', 'POLEA', 'BANDA', 'ACCESORIO', 'OTRO',
] as const;

const SCREAMING = /^[A-Z_]+$/;

describe('coverage of the backend vocabulary', () => {
  it.each([...DATASET_MUSCLES, ...TAXONOMY_MUSCLES])('muscle %s has a Spanish label', (code) => {
    expect(EXERCISE_MUSCLE_LABELS_ES[vocabularyKey(code)]).toBeTruthy();
  });

  it.each(ZONES)('zone %s has a Spanish label', (code) => {
    expect(EXERCISE_BODY_PART_LABELS_ES[vocabularyKey(code)]).toBeTruthy();
  });

  it.each(EQUIPMENT)('equipment %s has a Spanish label', (code) => {
    expect(EXERCISE_EQUIPMENT_LABELS_ES[vocabularyKey(code)]).toBeTruthy();
  });

  it('never answers in SCREAMING_CASE, known or unknown', () => {
    const inputs = [
      ...DATASET_MUSCLES,
      ...TAXONOMY_MUSCLES,
      ...ZONES,
      ...EQUIPMENT,
      'NEW_MUSCLE_CODE',
      'QUADRICEPS_FEMORIS',
      'SERRATO',
      'adductors',
    ];
    for (const input of inputs) {
      for (const label of [
        muscleLabelEs(input),
        bodyPartLabelEs(input),
        exerciseGroupLabelEs(input),
        equipmentLabelEs(input),
      ]) {
        expect(label, `${input} → ${label}`).not.toMatch(SCREAMING);
      }
    }
  });

  it('agrees with the muscle names of @gymsheet/anatomy (copy of the backend taxonomy)', () => {
    for (const muscle of MUSCLES) {
      expect(muscleLabelEs(muscle.code), muscle.code).toBe(muscle.name);
    }
  });

  it('labels every anatomy group as a zone', () => {
    for (const { group } of musclesByGroup()) {
      expect(EXERCISE_BODY_PART_LABELS_ES[vocabularyKey(group.code)], group.code).toBeTruthy();
    }
  });
});

describe('muscleLabelEs', () => {
  it.each([
    ['abs', 'Abdominales'],
    ['pectorals', 'Pectorales'],
    ['biceps', 'Bíceps'],
    ['glutes', 'Glúteos'],
    ['delts', 'Deltoides'],
    ['triceps', 'Tríceps'],
    ['upper back', 'Espalda alta'],
    ['lats', 'Dorsales'],
    ['calves', 'Gemelos'],
    ['quads', 'Cuádriceps'],
    ['hamstrings', 'Isquiotibiales'],
    ['adductors', 'Aductores'],
    ['abductors', 'Abductores de cadera'],
    ['forearms', 'Antebrazos'],
    ['traps', 'Trapecios'],
    ['serratus anterior', 'Serrato anterior'],
    ['spine', 'Lumbares (erectores)'],
    ['levator scapulae', 'Elevador de la escápula'],
    ['cardiovascular system', 'Sistema cardiovascular'],
    ['neck', 'Cuello'],
    ['rotator cuff', 'Manguito rotador'],
    ['QUADRICEPS', 'Cuádriceps'],
    ['PECTORALIS_MAJOR', 'Pectoral mayor'],
    ['ERECTOR_SPINAE', 'Erectores espinales'],
  ])('%s → %s', (code, label) => {
    expect(muscleLabelEs(code)).toBe(label);
  });

  it('ignores case, separators and surrounding whitespace', () => {
    expect(muscleLabelEs('  Upper Back ')).toBe('Espalda alta');
    expect(muscleLabelEs('PECTORALS')).toBe('Pectorales');
    expect(muscleLabelEs('upper_back')).toBe('Espalda alta');
    expect(muscleLabelEs('deltoid-anterior')).toBe('Deltoides anterior');
  });

  it('falls back to the zone when the code is a group', () => {
    expect(muscleLabelEs('LEGS')).toBe('Piernas');
    expect(muscleLabelEs('PECHO')).toBe('Pecho');
  });

  it('keeps already-Spanish values and humanises unknown codes', () => {
    expect(muscleLabelEs('pecho')).toBe('Pecho');
    expect(muscleLabelEs('Tren superior')).toBe('Tren superior');
    expect(muscleLabelEs('Bíceps braquial')).toBe('Bíceps braquial');
    expect(muscleLabelEs('NEW_MUSCLE_CODE')).toBe('New muscle code');
  });

  it('returns an empty string for empty input', () => {
    expect(muscleLabelEs(null)).toBe('');
    expect(muscleLabelEs(undefined)).toBe('');
    expect(muscleLabelEs('   ')).toBe('');
  });
});

describe('bodyPartLabelEs', () => {
  it.each([
    ['back', 'Espalda'],
    ['cardio', 'Cardio'],
    ['chest', 'Pecho'],
    ['lower arms', 'Antebrazos'],
    ['lower legs', 'Pantorrillas'],
    ['neck', 'Cuello'],
    ['shoulders', 'Hombros'],
    ['upper arms', 'Brazos'],
    ['upper legs', 'Piernas'],
    ['waist', 'Abdomen'],
    ['CORE', 'Abdomen'],
    ['LEGS', 'Piernas'],
  ])('%s → %s', (code, label) => {
    expect(bodyPartLabelEs(code)).toBe(label);
  });

  it('ignores case and surrounding whitespace', () => {
    expect(bodyPartLabelEs(' UPPER LEGS')).toBe('Piernas');
  });

  it('keeps unknown or already-Spanish values, capitalised', () => {
    expect(bodyPartLabelEs('cadena posterior')).toBe('Cadena posterior');
    expect(bodyPartLabelEs('Pecho')).toBe('Pecho');
  });

  it('returns an empty string for empty input', () => {
    expect(bodyPartLabelEs(null)).toBe('');
    expect(bodyPartLabelEs('')).toBe('');
  });
});

describe('zone consistency', () => {
  it('gives every spelling of a zone the same label', () => {
    const groups: string[][] = [
      ['chest', 'CHEST', 'PECHO', 'Pecho'],
      ['back', 'BACK', 'ESPALDA'],
      ['shoulders', 'SHOULDERS', 'HOMBRO', 'Hombros'],
      ['upper arms', 'ARMS', 'BRAZOS'],
      ['upper legs', 'LEGS', 'PIERNA', 'Piernas'],
      ['lower legs', 'CALVES'],
      ['waist', 'CORE', 'ABDOMEN'],
      ['neck', 'NECK'],
      ['cardio', 'CARDIO'],
    ];
    for (const spellings of groups) {
      const labels = new Set(spellings.map((code) => zoneLabelEs(code)));
      expect([...labels], spellings.join(' / ')).toHaveLength(1);
    }
  });

  it('unifies the routine-draft zone of an exercise', () => {
    expect(muscleZone({ grupoMuscular: 'triceps', bodyPart: 'chest' })).toBe('Pecho');
    expect(muscleZone({ grupoMuscular: 'PECHO', bodyPart: null })).toBe('Pecho');
    expect(muscleZone({ grupoMuscular: 'PIERNA' })).toBe('Piernas');
    expect(muscleZone({ grupoMuscular: 'glutes', bodyPart: 'upper legs' })).toBe('Piernas');
    expect(muscleZone({ grupoMuscular: 'QUADRICEPS', bodyPart: '' })).toBe('Cuádriceps');
    expect(muscleZone({ grupoMuscular: 'otra cosa' })).toBe('Otra cosa');
  });
});

describe('exerciseGroupLabelEs', () => {
  it('translates muscles, codes and body parts alike', () => {
    expect(exerciseGroupLabelEs('pectorals')).toBe('Pectorales');
    expect(exerciseGroupLabelEs('Upper Legs')).toBe('Piernas');
    expect(exerciseGroupLabelEs('neck')).toBe('Cuello');
    expect(exerciseGroupLabelEs('QUADRICEPS')).toBe('Cuádriceps');
    expect(exerciseGroupLabelEs('adductors')).toBe('Aductores');
  });

  it('keeps Spanish or unknown values and empties', () => {
    expect(exerciseGroupLabelEs('pecho')).toBe('Pecho');
    expect(exerciseGroupLabelEs(null)).toBe('');
  });
});

describe('equipmentLabelEs', () => {
  it.each([
    ['leverage machine', 'Máquina de palanca'],
    ['body weight', 'Peso corporal'],
    ['MAQUINA', 'Máquina'],
    ['smith machine', 'Máquina Smith'],
  ])('%s → %s', (code, label) => {
    expect(equipmentLabelEs(code)).toBe(label);
  });

  it('humanises unknown equipment and keeps empties', () => {
    expect(equipmentLabelEs('LANDMINE_ATTACHMENT')).toBe('Landmine attachment');
    expect(equipmentLabelEs('')).toBe('');
  });
});

describe('humanizeCode', () => {
  it('turns codes into readable text and leaves mixed case alone', () => {
    expect(humanizeCode('SOME_CODE')).toBe('Some code');
    expect(humanizeCode('Tren superior')).toBe('Tren superior');
    expect(humanizeCode('x')).toBe('X');
    expect(humanizeCode(null)).toBe('');
  });
});
