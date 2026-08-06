import type { UserRole } from '@/shared/api/contracts';
import type { ResolvedTutorial, TutorialDefinition } from '../model/types';
import { validateTutorials, type TutorialValidationIssue } from '../model/validation';

/**
 * Immutable, role-aware catalogue of tutorial definitions. The engine and the
 * Tutorial Center both read from a single shared instance. Adding a tutorial
 * means registering a new definition here — the engine never changes.
 */
export class TutorialRegistry {
  private readonly byId: Map<string, TutorialDefinition>;
  private readonly order: readonly string[];
  readonly issues: readonly TutorialValidationIssue[];

  constructor(definitions: readonly TutorialDefinition[]) {
    this.issues = validateTutorials(definitions);
    const blocking = this.issues.filter((issue) => issue.level === 'error');
    // Fail fast during development so a malformed config never ships silently,
    // but keep production resilient by simply dropping the offending tutorials.
    if (blocking.length > 0 && process.env.NODE_ENV !== 'production') {
      const summary = blocking.map((issue) => `- ${issue.message}`).join('\n');
      throw new Error(`Configuración de tutoriales inválida:\n${summary}`);
    }
    const blockedIds = new Set(blocking.map((issue) => issue.tutorialId));
    const usable = definitions.filter((def) => !blockedIds.has(def.id));
    this.byId = new Map(usable.map((def) => [def.id, def]));
    this.order = usable.map((def) => def.id);
  }

  all(): readonly TutorialDefinition[] {
    return this.order.map((id) => this.byId.get(id)!);
  }

  get(id: string): TutorialDefinition | undefined {
    return this.byId.get(id);
  }

  /** True when the role is allowed to run the tutorial. */
  canRun(def: TutorialDefinition, role: UserRole): boolean {
    return !def.roles || def.roles.includes(role);
  }

  /** Tutorials visible to a role, in registration order. */
  forRole(role: UserRole): ResolvedTutorial[] {
    return this.all()
      .filter((def) => this.canRun(def, role))
      .map((def) => this.resolveForRole(def.id, role))
      .filter((def): def is ResolvedTutorial => def !== null);
  }

  /** A single tutorial with its steps filtered down to the role. */
  resolveForRole(id: string, role: UserRole): ResolvedTutorial | null {
    const def = this.byId.get(id);
    if (!def || !this.canRun(def, role)) return null;
    const steps = def.steps.filter((step) => !step.roles || step.roles.includes(role));
    if (steps.length === 0) return null;
    return { ...def, steps };
  }
}
