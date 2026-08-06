import { describe, expect, it } from 'vitest';
import { validateTutorials } from './validation';
import type { TutorialDefinition } from './types';

function tutorial(overrides: Partial<TutorialDefinition> & { id: string }): TutorialDefinition {
  return {
    version: '1.0.0',
    title: overrides.id,
    description: 'x',
    category: 'INTRODUCTION',
    difficulty: 'BEGINNER',
    estimatedMinutes: 1,
    steps: [{ id: 's1', title: 't', description: 'd', target: 'x' }],
    ...overrides,
  };
}

describe('validateTutorials', () => {
  it('accepts a well-formed catalogue', () => {
    const issues = validateTutorials([tutorial({ id: 'a' }), tutorial({ id: 'b' })]);
    expect(issues.filter((i) => i.level === 'error')).toHaveLength(0);
  });

  it('flags duplicate tutorial ids', () => {
    const issues = validateTutorials([tutorial({ id: 'a' }), tutorial({ id: 'a' })]);
    expect(issues.some((i) => i.code === 'duplicate-tutorial-id')).toBe(true);
  });

  it('flags empty tutorials', () => {
    const issues = validateTutorials([tutorial({ id: 'a', steps: [] })]);
    expect(issues.some((i) => i.code === 'empty-tutorial')).toBe(true);
  });

  it('flags duplicate step ids', () => {
    const issues = validateTutorials([
      tutorial({
        id: 'a',
        steps: [
          { id: 's', title: 't', description: 'd', target: 'x' },
          { id: 's', title: 't', description: 'd', target: 'y' },
        ],
      }),
    ]);
    expect(issues.some((i) => i.code === 'duplicate-step-id')).toBe(true);
  });

  it('warns when a step has neither target nor route', () => {
    const issues = validateTutorials([
      tutorial({ id: 'a', steps: [{ id: 's', title: 't', description: 'd' }] }),
    ]);
    expect(issues.some((i) => i.code === 'step-without-target' && i.level === 'warning')).toBe(true);
  });

  it('flags missing prerequisites', () => {
    const issues = validateTutorials([tutorial({ id: 'a', prerequisites: ['ghost'] })]);
    expect(issues.some((i) => i.code === 'missing-prerequisite')).toBe(true);
  });

  it('detects circular prerequisites', () => {
    const issues = validateTutorials([
      tutorial({ id: 'a', prerequisites: ['b'] }),
      tutorial({ id: 'b', prerequisites: ['a'] }),
    ]);
    expect(issues.some((i) => i.code === 'circular-prerequisite')).toBe(true);
  });

  it('flags a step restricted to roles the tutorial does not allow', () => {
    const issues = validateTutorials([
      tutorial({
        id: 'a',
        roles: ['CLIENTE'],
        steps: [{ id: 's', title: 't', description: 'd', target: 'x', roles: ['ADMIN'] }],
      }),
    ]);
    expect(issues.some((i) => i.code === 'step-role-unreachable')).toBe(true);
  });

  it('flags prerequisites whose roles never overlap', () => {
    const issues = validateTutorials([
      tutorial({ id: 'a', roles: ['CLIENTE'], prerequisites: ['b'] }),
      tutorial({ id: 'b', roles: ['ADMIN'] }),
    ]);
    expect(issues.some((i) => i.code === 'prerequisite-role-mismatch')).toBe(true);
  });
});
