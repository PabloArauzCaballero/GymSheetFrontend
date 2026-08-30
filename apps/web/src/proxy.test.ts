import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { config, knownRoutes } from './proxy';

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
