import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { config, knownRoutes, proxy } from './proxy';

/**
 * `knownRoutes` decide si una ruta merece el muro de acceso o un 404 (M-4).
 * Como el proxy corre en el edge no puede leer el árbol de `app/`, así que la
 * lista es estática — y una lista estática se queda vieja en silencio: la
 * siguiente ruta que alguien añada respondería 404 a todo el mundo. Esta prueba
 * es el único sitio donde sí se puede mirar el disco, y por eso lo hace.
 */
function topLevelRouteSegments(): string[] {
  const appDir = join(dirname(fileURLToPath(import.meta.url)), 'app');
  const segments: string[] = [];

  // El propio matcher del proxy dice a qué rutas se aplica: `api`, los estáticos
  // de Next y los recursos de marca (`brand-mark.svg`) nunca llegan a él, así
  // que exigirles sitio en `knownRoutes` sería falso. Se consulta el matcher en
  // vez de repetir la lista aquí, para que no haya dos verdades.
  const applies = (segment: string) =>
    config.matcher.some((pattern) => new RegExp(`^${pattern}$`).test(`/${segment}`));

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (!entry.name.startsWith('(') && !applies(entry.name)) continue;
      // Los grupos `(portal)` / `(auth)` no aparecen en la URL: sus hijos son
      // los que ocupan el primer segmento.
      if (entry.name.startsWith('(') && entry.name.endsWith(')')) {
        walk(join(dir, entry.name));
        continue;
      }
      // Un segmento dinámico de primer nivel no se puede enumerar; hoy no hay.
      if (entry.name.startsWith('[') || entry.name.startsWith('_')) continue;
      segments.push(entry.name);
    }
  };

  walk(appDir);
  return segments;
}

describe('knownRoutes', () => {
  it('cubre todas las rutas de primer nivel que existen en app/', () => {
    const missing = topLevelRouteSegments().filter((segment) => !knownRoutes.has(segment));
    expect(missing).toEqual([]);
  });
});

describe('public assets', () => {
  // A `public/` folder named like a page route (e.g. `marketplace/`) sends its files
  // through the login wall: anonymous visitors of a public page got broken images.
  it('no top-level public folder shares its name with a route', () => {
    const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
    const clashing = readdirSync(publicDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && knownRoutes.has(entry.name))
      .map((entry) => entry.name);
    expect(clashing).toEqual([]);
  });
});

describe('installation cookie', () => {
  it('is minted on the first page load and handed to this same render', () => {
    const response = proxy(new NextRequest('http://localhost:3002/login'));
    const cookie = response.cookies.get('gymsheet_installation');
    expect(cookie?.value).toMatch(/^[0-9a-f-]{36}$/u);
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' });
    // The forwarded request carries it, so Server Components send X-Installation-Id now.
    expect(response.headers.get('x-middleware-request-cookie')).toContain(`gymsheet_installation=${cookie?.value}`);
  });

  it('is not replaced once the browser has one, even on a redirect', () => {
    const existing = '2f6d8a3e-4b1c-4d2e-9f00-1a2b3c4d5e6f';
    const request = new NextRequest('http://localhost:3002/dashboard', {
      headers: { cookie: `gymsheet_installation=${existing}` },
    });
    const response = proxy(request);
    expect(response.status).toBe(307);
    expect(response.cookies.get('gymsheet_installation')).toBeUndefined();
  });
});

describe('business routes (ADR-0020)', () => {
  it('rewrites /@handle to the public profile without a session', () => {
    const response = proxy(new NextRequest('http://localhost:3002/@top.fitness'));
    expect(response.headers.get('x-middleware-rewrite')).toBe('http://localhost:3002/n/top.fitness');
  });

  it('also rewrites an encoded @', () => {
    const response = proxy(new NextRequest('http://localhost:3002/%40topfit'));
    expect(response.headers.get('x-middleware-rewrite')).toBe('http://localhost:3002/n/topfit');
  });

  it('opens the business signup without a session', () => {
    const response = proxy(new NextRequest('http://localhost:3002/negocio/registro'));
    expect(response.headers.get('location')).toBeNull();
  });

  it('keeps the business portal behind the login wall', () => {
    const response = proxy(new NextRequest('http://localhost:3002/negocio'));
    expect(response.headers.get('location')).toBe('http://localhost:3002/login?returnTo=%2Fnegocio');
  });

  it('does not treat /notifications as the public /n/ profile', () => {
    const response = proxy(new NextRequest('http://localhost:3002/notifications'));
    expect(response.status).toBe(307);
  });
});
