import { describe, expect, it } from 'vitest';
import { roleLabel } from './role-labels';

describe('roleLabel', () => {
  it('traduce los roles conocidos', () => {
    expect(roleLabel('SYSTEM_ADMIN')).toBe('Administrador del sistema');
    expect(roleLabel('NEGOCIO')).toBe('Negocio');
    expect(roleLabel('CLIENTE')).toBe('Socio');
    expect(roleLabel('MODERATOR')).toBe('Moderación REPP');
  });
  it('humaniza un rol desconocido sin guiones bajos', () => {
    expect(roleLabel('NEW_ROLE')).toBe('New role');
  });
  it('devuelve vacío sin rol', () => {
    expect(roleLabel(undefined)).toBe('');
  });
});
