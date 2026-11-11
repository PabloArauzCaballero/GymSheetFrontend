/**
 * Pruebas de la partitura de la entrada de marca.
 *
 * El paquete declara `jest` como script pero no lo tiene instalado, así que se
 * ejecutan con el Vitest del monorepo:
 *
 *   node_modules/.bin/vitest run --root apps/mobile
 *
 * Por lo mismo `tsconfig.json` deja fuera los `*.test.ts`: Vitest solo está
 * instalado en `apps/web` y sus tipos no se resuelven desde aquí.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { colors } from '@gymsheet/design-tokens';
import {
  BAR_COUNT,
  BAR_LOADS,
  BAR_OPEN_SCALE,
  BAR_SEALED_SCALE,
  HANDOFF_SETTLE_FRAMES,
  MONOGRAM_FROM_SCALE,
  SPLASH_TIMING,
  barFrame,
  barStartAt,
  easeInOut,
  easeOut,
  initialClock,
  introDuration,
  monogramFrame,
  rulingFrame,
  sealEndAt,
  sealOpacity,
  segment,
  shouldHandOff,
  totalDuration,
  wordmarkFrame,
} from './sequence';

const T = SPLASH_TIMING;
const bars = Array.from({ length: BAR_COUNT }, (_, index) => index);
/** Cada milisegundo de la entrada, extremos incluidos. */
const everyMs = Array.from({ length: T.introEnd + 1 }, (_, ms) => ms);

describe('tramos y curvas', () => {
  it('segment se queda en 0 antes, en 1 después y es lineal dentro', () => {
    expect(segment(99, 100, 200)).toBe(0);
    expect(segment(100, 100, 200)).toBe(0);
    expect(segment(200, 100, 200)).toBe(0.5);
    expect(segment(300, 100, 200)).toBe(1);
    expect(segment(9999, 100, 200)).toBe(1);
  });

  it('segment con duración nula es un escalón, no una división por cero', () => {
    expect(segment(99, 100, 0)).toBe(0);
    expect(segment(100, 100, 0)).toBe(1);
  });

  const curves: readonly (readonly [string, (progress: number) => number])[] = [
    ['easeOut', easeOut],
    ['easeInOut', easeInOut],
  ];

  it.each(curves)('%s va de 0 a 1 sin retroceder ni rebasar', (_name, ease) => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    let previous = 0;
    for (let step = 1; step <= 100; step += 1) {
      const value = ease(step / 100);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value).toBeLessThanOrEqual(1);
      previous = value;
    }
  });
});

describe('primer cuadro', () => {
  it('no dibuja nada: es el fondo liso del splash nativo', () => {
    for (const index of bars) expect(barFrame(0, index).opacity).toBe(0);
    expect(monogramFrame(0).opacity).toBe(0);
    expect(rulingFrame(0).opacity).toBe(0);
    expect(wordmarkFrame(0).opacity).toBe(0);
    expect(wordmarkFrame(0).sunk).toBe(1);
  });

  it('usa el mismo fondo que el splash nativo declarado en app.json', () => {
    const appJson = JSON.parse(
      readFileSync(fileURLToPath(new URL('../../app.json', import.meta.url).href), 'utf8'),
    ) as { expo: { splash: { backgroundColor: string } } };
    expect(appJson.expo.splash.backgroundColor.toLowerCase()).toBe(
      colors.background.toLowerCase(),
    );
  });
});

describe('columnas', () => {
  it('la carga es una progresión creciente que termina en el tope', () => {
    for (let index = 1; index < BAR_COUNT; index += 1) {
      expect(BAR_LOADS[index]!).toBeGreaterThan(BAR_LOADS[index - 1]!);
    }
    expect(BAR_LOADS[BAR_COUNT - 1]).toBe(1);
  });

  it('arrancan escalonadas, en orden', () => {
    expect(barStartAt(0)).toBe(T.barsStart);
    for (const index of bars.slice(1)) {
      expect(barStartAt(index) - barStartAt(index - 1)).toBe(T.barStagger);
    }
  });

  it('antes del cierre cada una asienta en su carga, abierta', () => {
    for (const index of bars.slice(0, -1)) {
      const settled = barStartAt(index) + T.barRise;
      expect(settled).toBeLessThanOrEqual(T.lockStart);
      const frame = barFrame(settled, index);
      expect(frame.scaleY).toBeCloseTo(BAR_LOADS[index]!, 6);
      expect(frame.scaleX).toBe(BAR_OPEN_SCALE);
    }
  });

  it('el cierre se solapa con la llegada de la última, sin esperar a que pare', () => {
    const lastSettles = barStartAt(BAR_COUNT - 1) + T.barRise;
    expect(T.lockStart).toBeLessThan(lastSettles);
    expect(T.lockStart).toBeGreaterThan(barStartAt(BAR_COUNT - 1));
  });

  it('al cerrar forman un bloque: altura completa y solapadas', () => {
    const closed = T.lockStart + T.lockDuration;
    for (const index of bars) {
      const frame = barFrame(closed, index);
      expect(frame.scaleY).toBe(1);
      expect(frame.scaleX).toBe(BAR_SEALED_SCALE);
    }
    expect(BAR_SEALED_SCALE).toBeGreaterThan(1);
  });

  it('el recuadro macizo releva a las columnas sin dejar un cuadro vacío', () => {
    expect(sealOpacity(0)).toBe(0);
    expect(sealOpacity(T.sealStart)).toBe(0);
    expect(T.sealStart).toBeGreaterThan(T.lockStart);
    expect(sealEndAt()).toBe(T.lockStart + T.lockDuration);
    // Mientras el macizo no es opaco, las columnas siguen debajo.
    for (const ms of everyMs) {
      if (ms <= barStartAt(BAR_COUNT - 1)) continue;
      const covered = sealOpacity(ms) === 1;
      for (const index of bars) {
        if (!covered) expect(barFrame(ms, index).opacity).toBe(1);
      }
    }
    // Sellado, las columnas dejan de dibujarse.
    expect(sealOpacity(sealEndAt())).toBe(1);
    for (const index of bars) expect(barFrame(sealEndAt() + 1, index).opacity).toBe(0);
  });

  it('nunca bajan, nunca rebasan el recuadro y nunca llegan a escala 0', () => {
    for (const index of bars) {
      let previous = 0;
      for (const ms of everyMs) {
        const { scaleY } = barFrame(ms, index);
        expect(scaleY).toBeGreaterThan(0);
        expect(scaleY).toBeLessThanOrEqual(1);
        expect(scaleY).toBeGreaterThanOrEqual(previous);
        previous = scaleY;
      }
    }
  });

  it('un índice fuera de rango no rompe el cuadro', () => {
    const frame = barFrame(T.introEnd, BAR_COUNT + 3);
    expect(Number.isFinite(frame.scaleY)).toBe(true);
  });
});

describe('orquestación', () => {
  it('el monograma entra durante el cierre y asienta en su tamaño', () => {
    expect(T.monogramStart).toBeGreaterThan(T.lockStart);
    expect(T.monogramStart).toBeLessThan(T.lockStart + T.lockDuration);
    expect(monogramFrame(T.monogramStart).scale).toBe(MONOGRAM_FROM_SCALE);
    const settled = monogramFrame(T.monogramStart + T.monogramDuration);
    expect(settled).toEqual({ opacity: 1, scale: 1 });
  });

  it('el renglón se traza antes de que el nombre empiece a subir', () => {
    expect(T.rulingStart).toBeLessThan(T.wordmarkStart);
    expect(rulingFrame(T.wordmarkStart).scaleX).toBeGreaterThan(0);
    expect(T.wordmarkStart).toBeLessThan(T.rulingStart + T.rulingDuration);
  });

  it('todo ha terminado antes del fin de la entrada, con un reposo', () => {
    const lastMotionEnds = Math.max(
      barStartAt(BAR_COUNT - 1) + T.barRise,
      T.lockStart + T.lockDuration,
      T.monogramStart + T.monogramDuration,
      T.rulingStart + T.rulingDuration,
      T.wordmarkStart + T.wordmarkDuration,
    );
    expect(lastMotionEnds).toBeLessThan(T.introEnd);
    expect(wordmarkFrame(T.introEnd)).toEqual({ sunk: 0, opacity: 1 });
    expect(rulingFrame(T.introEnd)).toEqual({ scaleX: 1, opacity: 1 });
  });

  it('la duración total cabe en el presupuesto de 1,2 a 1,8 s', () => {
    expect(totalDuration(false)).toBeGreaterThanOrEqual(1200);
    expect(totalDuration(false)).toBeLessThanOrEqual(1800);
  });

  it('la salida es más corta que cualquier tramo de entrada', () => {
    expect(T.exitDuration).toBeLessThan(T.lockDuration);
    expect(T.exitDuration).toBeLessThan(T.barRise);
  });
});

describe('reducir movimiento', () => {
  it('la marca nace completa y quieta', () => {
    const clock = initialClock(true);
    expect(sealOpacity(clock)).toBe(1);
    for (const index of bars) expect(barFrame(clock, index).opacity).toBe(0);
    expect(monogramFrame(clock)).toEqual({ opacity: 1, scale: 1 });
    expect(wordmarkFrame(clock)).toEqual({ sunk: 0, opacity: 1 });
    expect(initialClock(false)).toBe(0);
  });

  it('espera menos que la entrada animada', () => {
    expect(introDuration(true)).toBe(T.reducedHold);
    expect(introDuration(false)).toBe(T.introEnd);
    expect(totalDuration(true)).toBeLessThan(totalDuration(false));
  });
});

describe('entrega a la aplicación', () => {
  it('no corta la entrada a medias aunque la aplicación ya esté lista', () => {
    expect(shouldHandOff({ introDone: false, appReady: true, capReached: false })).toBe(false);
  });

  it('entrega en cuanto termina si la aplicación está lista', () => {
    expect(shouldHandOff({ introDone: true, appReady: true, capReached: false })).toBe(true);
  });

  it('espera a la aplicación si todavía no hay pantalla que mostrar', () => {
    expect(shouldHandOff({ introDone: true, appReady: false, capReached: false })).toBe(false);
  });

  it('pasado el tope entrega igualmente: una red lenta no la retiene', () => {
    expect(shouldHandOff({ introDone: true, appReady: false, capReached: true })).toBe(true);
    expect(T.handoffCap).toBeGreaterThan(totalDuration(false));
  });

  it('el tope entrega por sí solo aunque la entrada nunca avise de que terminó', () => {
    expect(shouldHandOff({ introDone: false, appReady: false, capReached: true })).toBe(true);
    expect(shouldHandOff({ introDone: false, appReady: true, capReached: true })).toBe(true);
  });

  it('deja asentar la pantalla de debajo uno o dos cuadros antes del fundido', () => {
    expect(HANDOFF_SETTLE_FRAMES).toBeGreaterThanOrEqual(1);
    expect(HANDOFF_SETTLE_FRAMES).toBeLessThanOrEqual(2);
  });
});
