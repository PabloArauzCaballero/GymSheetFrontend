import { describe, expect, it } from 'vitest';
import { genderChoiceOf, gendersFor, toggleInterest, toggleIntent, toggleSingle } from './discovery-choices';

describe('toggleIntent', () => {
  it('selecting UNSURE clears every other intent', () => {
    expect(toggleIntent(['TRAINING', 'DATING'], 'UNSURE')).toEqual(['UNSURE']);
  });

  it('selecting another intent clears UNSURE', () => {
    expect(toggleIntent(['UNSURE'], 'FRIENDSHIP')).toEqual(['FRIENDSHIP']);
  });

  it('combines regular intents and deselects on a second tap', () => {
    expect(toggleIntent(['TRAINING'], 'DATING')).toEqual(['TRAINING', 'DATING']);
    expect(toggleIntent(['TRAINING', 'DATING'], 'TRAINING')).toEqual(['DATING']);
    expect(toggleIntent(['UNSURE'], 'UNSURE')).toEqual([]);
  });
});

describe('genders', () => {
  it('maps «Todos» to both saved values and back', () => {
    expect(gendersFor('ALL')).toEqual(['MALE', 'FEMALE']);
    expect(gendersFor('FEMALE')).toEqual(['FEMALE']);
    expect(genderChoiceOf(['FEMALE', 'MALE'])).toBe('ALL');
    expect(genderChoiceOf(['MALE'])).toBe('MALE');
    expect(genderChoiceOf([])).toBeNull();
  });
});

describe('toggleInterest', () => {
  it('never goes past the limit and still lets you remove one', () => {
    const five = ['A', 'B', 'C', 'D', 'E'];
    expect(toggleInterest(five, 'F', 5)).toEqual(five);
    expect(toggleInterest(five, 'C', 5)).toEqual(['A', 'B', 'D', 'E']);
    expect(toggleInterest(['A'], 'B', 5)).toEqual(['A', 'B']);
  });
});

describe('toggleSingle', () => {
  it('clears the answer when the selected option is tapped again', () => {
    expect(toggleSingle<'NEVER' | 'OFTEN'>('NEVER', 'NEVER')).toBeNull();
    expect(toggleSingle<'NEVER' | 'OFTEN'>('NEVER', 'OFTEN')).toBe('OFTEN');
  });
});
