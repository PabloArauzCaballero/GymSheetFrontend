import { describe, expect, it } from 'vitest';
import { saveStatusLabel, sectionSaveStatus } from './save-status';

describe('section save status', () => {
  it('says nothing before any change, and the pending draft once edited', () => {
    expect(sectionSaveStatus({ dirty: false, mutation: undefined })).toBe('idle');
    expect(sectionSaveStatus({ dirty: true, mutation: undefined })).toBe('dirty');
  });

  it('saving wins over a draft; a clean draft after success is saved', () => {
    expect(sectionSaveStatus({ dirty: true, mutation: 'pending' })).toBe('saving');
    expect(sectionSaveStatus({ dirty: false, mutation: 'success' })).toBe('saved');
  });

  it('editing again after a save is a new draft, not «saved»', () => {
    expect(sectionSaveStatus({ dirty: true, mutation: 'success' })).toBe('dirty');
  });

  it('a failure stays visible until the next attempt', () => {
    expect(sectionSaveStatus({ dirty: true, mutation: 'error' })).toBe('failed');
    expect(sectionSaveStatus({ dirty: false, mutation: 'error' })).toBe('failed');
  });

  it('labels each state in the same words on both platforms', () => {
    expect(saveStatusLabel('idle', 'Bio guardada')).toBeNull();
    expect(saveStatusLabel('dirty', 'Bio guardada')).toBe('Cambios sin guardar');
    expect(saveStatusLabel('saving', 'Bio guardada')).toBe('Guardando…');
    expect(saveStatusLabel('saved', 'Bio guardada')).toBe('Bio guardada');
    expect(saveStatusLabel('failed', 'Bio guardada')).toBe('No se guardó. Inténtalo de nuevo.');
  });
});
