import { describe, expect, it } from 'vitest';
import { validateTutorials } from '../model/validation';
import { allTutorialDefinitions } from './definitions';
import { sendaOverview } from './definitions/senda';
import { TutorialRegistry } from './tutorial-registry';

describe('senda-overview tutorial', () => {
  it('is registered and visible to members', () => {
    const registry = new TutorialRegistry(allTutorialDefinitions);
    const forClient = registry.forRole('CLIENTE').map((tutorial) => tutorial.id);
    expect(forClient).toContain('senda-overview');
  });

  it('has no configuration errors', () => {
    const blocking = validateTutorials([sendaOverview]).filter((issue) => issue.level === 'error');
    expect(blocking).toEqual([]);
  });

  it('anchors every step on the senda page', () => {
    for (const step of sendaOverview.steps) {
      expect(step.route).toBe('/trayectoria');
      expect(step.target).toMatch(/^progression:/u);
    }
  });
});

describe('senda-overview con retos', () => {
  it('explica los retos antes que la colección, y el camino al final', () => {
    const ids = sendaOverview.steps.map((step) => step.id);
    expect(ids).toEqual(['rank', 'rules', 'challenges', 'badges', 'path']);
    const challenges = sendaOverview.steps.find((step) => step.id === 'challenges');
    // Un servidor sin retos no pinta la tarjeta: el paso se salta en vez de fallar.
    expect(challenges?.optional).toBe(true);
  });
});
