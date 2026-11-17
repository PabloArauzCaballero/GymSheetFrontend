import { describe, expect, it } from 'vitest';
import { navigationFor } from './nav-config';
import { tabBarFor } from './tab-bar-config';

const hrefs = (role: Parameters<typeof navigationFor>[0], permissions?: string[]) =>
  navigationFor(role, permissions).flatMap((group) => group.items.map((item) => item.href));

const isAdministration = (href: string) => href.startsWith('/admin') || href.startsWith('/sistema') || href.startsWith('/moderacion');

describe('navigationFor (franja 7a)', () => {
  it.each(['ADMIN', 'FRONT_DESK', 'COACH', 'ENTRENADOR_EXTERNO', 'CLIENTE'] as const)(
    '%s gets the person portal and no administration entry',
    (role) => {
      const all = hrefs(role, ['admin-access:manage', 'support:read']);
      expect(all).toContain('/comunidad');
      expect(all.filter(isAdministration)).toEqual([]);
      expect(tabBarFor(role).map((item) => item.href).filter(isAdministration)).toEqual([]);
    },
  );

  it('the platform admin gets the platform and the gym modules', () => {
    const groups = navigationFor('SYSTEM_ADMIN', ['admin-access:manage']);
    expect(groups.map((group) => group.label)).toEqual(['Plataforma', 'Gimnasio']);
    const gym = groups[1]?.items.map((item) => item.href) ?? [];
    expect(gym).toEqual(
      expect.arrayContaining(['/admin/operacion', '/admin/membership', '/admin/facilities', '/admin/permissions']),
    );
    expect(groups[0]?.items.map((item) => item.href)).toContain('/sistema');
  });

  it('permission-gated gym modules still need the grant', () => {
    expect(hrefs('SYSTEM_ADMIN', [])).not.toContain('/admin/permissions');
  });
});
