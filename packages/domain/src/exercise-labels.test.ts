import { describe, expect, it } from 'vitest';
import { bodyPartLabelEs, exerciseGroupLabelEs, muscleLabelEs } from './exercise-labels';

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
    ['abductors', 'Abductores'],
    ['forearms', 'Antebrazos'],
    ['traps', 'Trapecios'],
    ['serratus anterior', 'Serrato anterior'],
    ['spine', 'Lumbares (erectores)'],
    ['levator scapulae', 'Elevador de la escápula'],
    ['cardiovascular system', 'Sistema cardiovascular'],
    ['neck', 'Cuello'],
  ])('%s → %s', (code, label) => {
    expect(muscleLabelEs(code)).toBe(label);
  });

  it('ignores case and surrounding whitespace', () => {
    expect(muscleLabelEs('  Upper Back ')).toBe('Espalda alta');
    expect(muscleLabelEs('PECTORALS')).toBe('Pectorales');
  });

  it('keeps unknown or already-Spanish values, capitalised', () => {
    expect(muscleLabelEs('rotator cuff')).toBe('Rotator cuff');
    expect(muscleLabelEs('pecho')).toBe('Pecho');
    expect(muscleLabelEs('Tren superior')).toBe('Tren superior');
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
    ['upper legs', 'Muslos'],
    ['waist', 'Cintura'],
  ])('%s → %s', (code, label) => {
    expect(bodyPartLabelEs(code)).toBe(label);
  });

  it('ignores case and surrounding whitespace', () => {
    expect(bodyPartLabelEs(' UPPER LEGS')).toBe('Muslos');
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

describe('exerciseGroupLabelEs', () => {
  it('translates muscles and body parts alike', () => {
    expect(exerciseGroupLabelEs('pectorals')).toBe('Pectorales');
    expect(exerciseGroupLabelEs('Upper Legs')).toBe('Muslos');
    expect(exerciseGroupLabelEs('neck')).toBe('Cuello');
  });

  it('keeps Spanish or unknown values and empties', () => {
    expect(exerciseGroupLabelEs('pecho')).toBe('Pecho');
    expect(exerciseGroupLabelEs(null)).toBe('');
  });
});
