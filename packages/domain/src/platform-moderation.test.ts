import { describe, expect, it } from 'vitest';
import {
  hasAdminPermissionGrants,
  isModerator,
  isPlatformModerator,
  isStaff,
} from './permissions';
import {
  MODERATOR_NOT_ASSIGNABLE,
  moderationResolutionLabel,
  moderatorErrorMessage,
  moderatorsCopy,
} from './platform-moderation';

describe('platform moderation roles', () => {
  it('only the REPP team and the platform admin moderate', () => {
    expect(isPlatformModerator('MODERATOR')).toBe(true);
    expect(isPlatformModerator('SYSTEM_ADMIN')).toBe(true);
    for (const role of ['ADMIN', 'FRONT_DESK', 'COACH', 'CLIENTE', 'ENTRENADOR_EXTERNO'] as const) {
      expect(isPlatformModerator(role)).toBe(false);
    }
    expect(isPlatformModerator(null)).toBe(false);
  });

  it('a moderator is neither gym staff nor a platform admin', () => {
    expect(isModerator('MODERATOR')).toBe(true);
    expect(isModerator('SYSTEM_ADMIN')).toBe(false);
    expect(isStaff('MODERATOR')).toBe(false);
  });

  it('asks for permission grants only where the backend answers them', () => {
    expect(hasAdminPermissionGrants('ADMIN')).toBe(true);
    expect(hasAdminPermissionGrants('FRONT_DESK')).toBe(true);
    expect(hasAdminPermissionGrants('SYSTEM_ADMIN')).toBe(true);
    expect(hasAdminPermissionGrants('MODERATOR')).toBe(false);
    expect(hasAdminPermissionGrants('COACH')).toBe(false);
  });
});

describe('moderationResolutionLabel', () => {
  it('names every verdict', () => {
    expect(moderationResolutionLabel('SIN_ACCION')).toBe('Sin infracción');
    expect(moderationResolutionLabel('USUARIO_SUSPENDIDO')).toBe('Suspensión');
    expect(moderationResolutionLabel('MENOR_CONFIRMADO')).toBe('Menor de edad confirmado');
  });
  it('humanizes an unknown code', () => {
    expect(moderationResolutionLabel('NUEVO_VEREDICTO')).toBe('Nuevo veredicto');
  });
});

describe('moderatorErrorMessage', () => {
  it('maps the backend refusals', () => {
    expect(moderatorErrorMessage({ code: MODERATOR_NOT_ASSIGNABLE, status: 409 }, 'add')).toBe(
      moderatorsCopy.errors[MODERATOR_NOT_ASSIGNABLE],
    );
    expect(moderatorErrorMessage({ status: 404 }, 'add')).toBe(moderatorsCopy.errors.addNotFound);
    expect(moderatorErrorMessage({ status: 404 }, 'remove')).toBe(moderatorsCopy.errors.removeNotFound);
    expect(moderatorErrorMessage(new Error('boom'), 'remove')).toBe(moderatorsCopy.errors.failed);
  });
});
