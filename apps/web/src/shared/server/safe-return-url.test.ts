import { describe, expect, it } from 'vitest';
import { safeReturnUrl } from './safe-return-url';

const base = 'https://app.example.test/api/auth/logout';

describe('safeReturnUrl', () => {
  it('keeps a path of this site, with its query', () => {
    expect(safeReturnUrl('/adios', base).href).toBe('https://app.example.test/adios');
    expect(safeReturnUrl('/login?suspended=review', base).href).toBe('https://app.example.test/login?suspended=review');
  });

  it('sends anything that could leave the site to /login', () => {
    for (const attack of ['//evil.test', '/\\evil.test', '/\\/evil.test', 'https://evil.test', '/\t/evil.test', ' /x', null]) {
      expect(safeReturnUrl(attack, base).href).toBe('https://app.example.test/login');
    }
  });
});
