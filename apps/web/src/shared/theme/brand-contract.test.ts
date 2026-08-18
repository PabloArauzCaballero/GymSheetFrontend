import { describe, expect, it } from 'vitest';
import { applyBrandCopy, brandFontKeys, brandIconKeys, defaultBrand, fontVariableByKey } from './brand-contract';
import { brandIconByKey } from './brand-icons';

describe('contrato de marca', () => {
  it('cada tipografía del catálogo declara su variable', () => {
    for (const key of brandFontKeys) {
      expect(fontVariableByKey[key]).toMatch(/^var\(--font-[a-z]+\)$/u);
    }
  });

  // Los iconos de lucide llegan envueltos en `forwardRef`, así que se comprueba
  // que exista un componente renderizable y no su tipo concreto.
  it('cada glifo del catálogo tiene componente', () => {
    for (const key of brandIconKeys) {
      expect(brandIconByKey[key]).toBeDefined();
    }
    expect(new Set(Object.values(brandIconByKey)).size).toBe(brandIconKeys.length);
  });

  it('la marca de referencia usa claves válidas', () => {
    expect(brandFontKeys).toContain(defaultBrand.font);
    expect(brandIconKeys).toContain(defaultBrand.icon);
  });

  // Las copias de producto nombran al gimnasio sin conocer al inquilino.
  it('sustituye el marcador por el nombre del inquilino', () => {
    const brand = { ...defaultBrand, name: 'LiftHouse' };
    expect(applyBrandCopy('Bienvenido a {marca}', brand)).toBe('Bienvenido a LiftHouse');
    expect(applyBrandCopy('{marca} y {marca}', brand)).toBe('LiftHouse y LiftHouse');
    expect(applyBrandCopy('Sin marcador', brand)).toBe('Sin marcador');
  });
});
