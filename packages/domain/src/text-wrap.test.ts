import { describe, expect, it } from 'vitest';
import { noOrphan } from './text-wrap';

describe('noOrphan', () => {
  it('glues a short last word to the previous one', () => {
    expect(noOrphan('Escribe unas líneas sobre ti')).toBe('Escribe unas líneas sobre\u00A0ti');
    expect(noOrphan('días de racha')).toBe('días de\u00A0racha');
  });

  it('leaves long last words and single words alone', () => {
    expect(noOrphan('Marca qué te gusta entrenar')).toBe('Marca qué te gusta entrenar');
    expect(noOrphan('Compartir')).toBe('Compartir');
    expect(noOrphan('')).toBe('');
  });

  it('trims trailing spaces before gluing', () => {
    expect(noOrphan('Sube tu primera foto  ')).toBe('Sube tu primera\u00A0foto');
  });
});
