import { describe, expect, it, vi } from 'vitest';
import { TutorialRegistry } from './tutorial-registry';
import type { TutorialDefinition } from '../model/types';

const defs: TutorialDefinition[] = [
  {
    id: 'all',
    version: '1.0.0',
    title: 'All roles',
    description: 'd',
    category: 'INTRODUCTION',
    difficulty: 'BEGINNER',
    estimatedMinutes: 1,
    steps: [{ id: 's1', title: 't', description: 'd', target: 'x' }],
  },
  {
    id: 'admin-only',
    version: '1.0.0',
    title: 'Admin',
    description: 'd',
    category: 'ADMIN',
    difficulty: 'INTERMEDIATE',
    estimatedMinutes: 1,
    roles: ['ADMIN'],
    steps: [{ id: 's1', title: 't', description: 'd', target: 'x' }],
  },
  {
    id: 'mixed-steps',
    version: '1.0.0',
    title: 'Mixed',
    description: 'd',
    category: 'TRAINING',
    difficulty: 'BEGINNER',
    estimatedMinutes: 1,
    steps: [
      { id: 's1', title: 'everyone', description: 'd', target: 'x' },
      { id: 's2', title: 'admins', description: 'd', target: 'y', roles: ['ADMIN'] },
    ],
  },
];

describe('TutorialRegistry', () => {
  it('lists tutorials for a role, hiding those the role cannot access', () => {
    const registry = new TutorialRegistry(defs);
    const forClient = registry.forRole('CLIENTE').map((t) => t.id);
    expect(forClient).toContain('all');
    expect(forClient).not.toContain('admin-only');
    expect(registry.forRole('ADMIN').map((t) => t.id)).toContain('admin-only');
  });

  it('filters steps by role within a tutorial', () => {
    const registry = new TutorialRegistry(defs);
    expect(registry.resolveForRole('mixed-steps', 'CLIENTE')?.steps).toHaveLength(1);
    expect(registry.resolveForRole('mixed-steps', 'ADMIN')?.steps).toHaveLength(2);
  });

  it('returns null when no step is visible to the role', () => {
    const registry = new TutorialRegistry([
      {
        id: 'x',
        version: '1.0.0',
        title: 'x',
        description: 'd',
        category: 'TRAINING',
        difficulty: 'BEGINNER',
        estimatedMinutes: 1,
        steps: [{ id: 's', title: 't', description: 'd', target: 'x', roles: ['ADMIN'] }],
      },
    ]);
    expect(registry.resolveForRole('x', 'CLIENTE')).toBeNull();
  });

  it('drops tutorials with blocking config errors in production instead of throwing', () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      const registry = new TutorialRegistry([defs[0]!, defs[0]!]);
      // duplicate id → dropped, catalogue stays usable
      expect(registry.issues.some((i) => i.code === 'duplicate-tutorial-id')).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
