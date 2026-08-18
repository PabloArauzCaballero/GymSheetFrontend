import { describe, expect, it } from 'vitest';
import { buildThemeCss } from './build-theme-css';
import { colorTokens, cssVariableByToken, type TenantTheme } from './color-contract';
import { defaultTheme } from './default-palette';

const css = buildThemeCss(defaultTheme);

function withDark(overrides: Record<string, unknown>): TenantTheme {
  return { ...defaultTheme, dark: { ...defaultTheme.dark, ...overrides } };
}

describe('buildThemeCss', () => {
  it('publica todas las variables del contrato en ambos modos', () => {
    const dark = css.slice(0, css.indexOf("[data-theme='light']"));
    const light = css.slice(css.indexOf("[data-theme='light']"));
    for (const token of colorTokens) {
      expect(dark).toContain(`${cssVariableByToken[token]}:`);
      expect(light).toContain(`${cssVariableByToken[token]}:`);
    }
  });

  it('conserva los valores de la paleta tal cual', () => {
    expect(css).toContain('--background: #000000');
    expect(css).toContain('--volt: #c3f400');
    expect(css).toContain('--shadow-lg: 0 40px 120px -40px rgb(0 0 0 / 0.9)');
  });

  it('declara el esquema de color de cada modo', () => {
    expect(css).toContain('color-scheme: dark');
    expect(css).toContain('color-scheme: light');
  });

  // Sin canales, cada opacidad distinta del acento necesitaría su variable.
  it('descompone en canales los colores que se componen con alfa', () => {
    expect(css).toContain('--accent-channels: 195 244 0');
    expect(css).toContain('--scrim-channels: 0 0 0');
    expect(css).toContain('--sheen-channels: 255 255 255');
  });

  it('acepta hexadecimal corto al derivar canales', () => {
    expect(buildThemeCss(withDark({ accent: '#0f0' }))).toContain('--accent-channels: 0 255 0');
  });

  it('gana siempre a la hoja de la aplicación', () => {
    expect(css.startsWith(':root:root{')).toBe(true);
    expect(css).toContain(":root:root[data-theme='light']{");
  });

  it('rechaza un valor capaz de romper el bloque de estilo', () => {
    expect(() => buildThemeCss(withDark({ accent: '#fff;} body{display:none' }))).toThrow(
      /no puede contener/u,
    );
    expect(() => buildThemeCss(withDark({ text: '</style><script>' }))).toThrow(/no puede contener/u);
  });

  it('exige hexadecimal donde hace falta descomponer en canales', () => {
    expect(() => buildThemeCss(withDark({ accent: 'rgb(1 2 3)' }))).toThrow(/hexadecimal/u);
  });

  it('rechaza un escalar no numérico', () => {
    expect(() => buildThemeCss(withDark({ noiseOpacity: Number.NaN }))).toThrow(/numérico/u);
  });
});
