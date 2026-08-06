import type { TutorialDefinition } from './types';

export type TutorialValidationIssue = {
  level: 'error' | 'warning';
  code: string;
  tutorialId: string;
  stepId?: string;
  message: string;
};

/**
 * Statically validates a set of tutorial definitions. Catches the failure modes
 * the spec calls out: duplicate ids, empty tutorials, steps without a target,
 * dangling/circular prerequisites and role-incompatible prerequisites.
 *
 * Pure and side-effect free so it can run in tests and in a dev-only guard.
 */
export function validateTutorials(
  definitions: readonly TutorialDefinition[],
): TutorialValidationIssue[] {
  const issues: TutorialValidationIssue[] = [];
  const byId = new Map<string, TutorialDefinition>();

  for (const def of definitions) {
    if (byId.has(def.id)) {
      issues.push({
        level: 'error',
        code: 'duplicate-tutorial-id',
        tutorialId: def.id,
        message: `Identificador de tutorial duplicado: "${def.id}".`,
      });
      continue;
    }
    byId.set(def.id, def);
  }

  for (const def of definitions) {
    if (def.steps.length === 0) {
      issues.push({
        level: 'error',
        code: 'empty-tutorial',
        tutorialId: def.id,
        message: `El tutorial "${def.id}" no tiene pasos.`,
      });
    }

    const stepIds = new Set<string>();
    for (const step of def.steps) {
      if (stepIds.has(step.id)) {
        issues.push({
          level: 'error',
          code: 'duplicate-step-id',
          tutorialId: def.id,
          stepId: step.id,
          message: `Paso duplicado "${step.id}" en el tutorial "${def.id}".`,
        });
      }
      stepIds.add(step.id);

      const needsTarget = step.placement !== 'center';
      if (needsTarget && !step.target && !step.route) {
        issues.push({
          level: 'warning',
          code: 'step-without-target',
          tutorialId: def.id,
          stepId: step.id,
          message: `El paso "${step.id}" no define target ni route; se mostrará centrado.`,
        });
      }

      // A step restricted to roles outside the tutorial's roles can never show.
      if (step.roles && def.roles) {
        const reachable = step.roles.some((role) => def.roles?.includes(role));
        if (!reachable) {
          issues.push({
            level: 'error',
            code: 'step-role-unreachable',
            tutorialId: def.id,
            stepId: step.id,
            message: `El paso "${step.id}" está restringido a roles que el tutorial "${def.id}" no permite.`,
          });
        }
      }
    }

    for (const prerequisite of def.prerequisites ?? []) {
      const target = byId.get(prerequisite);
      if (!target) {
        issues.push({
          level: 'error',
          code: 'missing-prerequisite',
          tutorialId: def.id,
          message: `El prerrequisito "${prerequisite}" de "${def.id}" no existe.`,
        });
        continue;
      }
      // A prerequisite whose roles don't overlap can never be satisfied.
      if (def.roles && target.roles) {
        const overlap = def.roles.some((role) => target.roles?.includes(role));
        if (!overlap) {
          issues.push({
            level: 'error',
            code: 'prerequisite-role-mismatch',
            tutorialId: def.id,
            message: `El prerrequisito "${prerequisite}" no comparte roles con "${def.id}".`,
          });
        }
      }
    }
  }

  issues.push(...findCircularPrerequisites(byId));
  return issues;
}

/** Detects cycles in the prerequisite graph via depth-first search. */
function findCircularPrerequisites(
  byId: Map<string, TutorialDefinition>,
): TutorialValidationIssue[] {
  const issues: TutorialValidationIssue[] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const reported = new Set<string>();

  const visit = (id: string, trail: string[]): void => {
    const current = state.get(id);
    if (current === 'done') return;
    if (current === 'visiting') {
      const cycle = [...trail.slice(trail.indexOf(id)), id].join(' → ');
      if (!reported.has(cycle)) {
        reported.add(cycle);
        issues.push({
          level: 'error',
          code: 'circular-prerequisite',
          tutorialId: id,
          message: `Dependencia circular de prerrequisitos: ${cycle}.`,
        });
      }
      return;
    }
    state.set(id, 'visiting');
    for (const prerequisite of byId.get(id)?.prerequisites ?? []) {
      if (byId.has(prerequisite)) visit(prerequisite, [...trail, id]);
    }
    state.set(id, 'done');
  };

  for (const id of byId.keys()) visit(id, []);
  return issues;
}

/** Convenience for tests / dev guard: only the blocking issues. */
export function tutorialErrors(
  definitions: readonly TutorialDefinition[],
): TutorialValidationIssue[] {
  return validateTutorials(definitions).filter((issue) => issue.level === 'error');
}
