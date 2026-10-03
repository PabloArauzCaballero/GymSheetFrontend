import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..', '..', '..', '..', '..');
const TAGS = ['surface-front', 'surface-back', 'deep-front', 'deep-back'] as const;

function digest(path: string) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

describe('láminas anatómicas', () => {
  // La web sirve una copia de las láminas del móvil, y los contornos de
  // `@gymsheet/anatomy` se trazaron sobre esas imágenes: si una copia se
  // regenera y la otra no, lo que se resalta deja de caer sobre el músculo.
  it.each(TAGS)('%s es idéntica en web y móvil', (tag) => {
    expect(digest(join(root, 'apps/web/public/anatomy', `${tag}.webp`))).toBe(
      digest(join(root, 'apps/mobile/assets/anatomy', `${tag}.webp`)),
    );
  });
});
