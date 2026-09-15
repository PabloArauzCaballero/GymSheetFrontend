import {
  CARD_TIERS,
  cardTimeline,
  countUpDuration,
  countUpValue,
  particleField,
  seedFrom,
  shakeKeyframes,
  tensionTicks,
  tierFor,
  wobbleKeyframes,
} from '@gymsheet/domain';
import { describe, expect, it } from 'vitest';

describe('guion de la carta', () => {
  it('encadena los pasos en orden y termina después del texto', () => {
    for (const tier of Object.values(CARD_TIERS)) {
      const t = cardTimeline(tier);
      expect(t.tension.at).toBeLessThan(t.enter.at + t.enter.dur);
      expect(t.burst.at).toBe(t.tension.at + t.tension.dur);
      expect(t.flip.at).toBeGreaterThanOrEqual(t.burst.at);
      expect(t.stamp.at).toBeLessThan(t.flip.at + t.flip.dur);
      expect(t.text.at).toBeGreaterThan(t.stamp.at);
      expect(t.rest).toBeGreaterThan(t.text.at + t.text.dur);
    }
  });

  it('una legendaria tiembla más y revienta con más fuerza que una común', () => {
    const common = CARD_TIERS.COMUN;
    const legendary = CARD_TIERS.LEGENDARIA;
    expect(legendary.tensionMs).toBeGreaterThan(common.tensionMs);
    expect(legendary.particles).toBeGreaterThan(common.particles);
    expect(legendary.shake).toBeGreaterThan(common.shake);
  });

  it('un rango usa la fila legendaria', () => {
    expect(tierFor(null)).toBe(CARD_TIERS.LEGENDARIA);
    expect(tierFor('RARA')).toBe(CARD_TIERS.RARA);
  });

  it('las partículas son deterministas para la misma semilla', () => {
    const seed = seedFrom('Primera semana');
    expect(particleField(12, seed)).toEqual(particleField(12, seed));
    expect(particleField(12, seed)).not.toEqual(particleField(12, seedFrom('Otra')));
    expect(particleField(40, seed)).toHaveLength(40);
  });

  it('la sacudida y el temblor vuelven a reposo', () => {
    const shake = shakeKeyframes(6);
    expect(shake.x.at(0)).toBe(0);
    expect(shake.x.at(-1)).toBe(0);
    expect(shake.y.at(-1)).toBe(0);
    expect(shakeKeyframes(0)).toEqual({ x: [0], y: [0] });
    expect(wobbleKeyframes(6).at(-1)).toBe(0);
  });

  it('los tics de tensión se aceleran y caben en la tensión', () => {
    const ticks = tensionTicks(940);
    expect(ticks.every((tick) => tick < 940)).toBe(true);
    const gaps = ticks.slice(1).map((tick, index) => tick - (ticks[index] ?? 0));
    expect(gaps.every((gap, index) => index === 0 || gap <= (gaps[index - 1] ?? Infinity))).toBe(
      true,
    );
  });
});

describe('contadores', () => {
  it('eligen la duración por la magnitud del salto', () => {
    expect(countUpDuration(0, 0)).toBe(0);
    expect(countUpDuration(0, 74)).toBe(600);
    expect(countUpDuration(1190, 1264)).toBe(600);
    expect(countUpDuration(0, 900)).toBe(1000);
    expect(countUpDuration(0, 9000)).toBe(1400);
    expect(countUpDuration(0, 25000)).toBe(1800);
  });

  it('empiezan en el origen y llegan exactos al destino', () => {
    expect(countUpValue(1190, 1264, 0)).toBe(1190);
    expect(countUpValue(1190, 1264, 1)).toBe(1264);
    expect(countUpValue(0, 100, 2)).toBe(100);
  });
});
