'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useMemo, type ReactNode } from 'react';
import type { UserRole } from '@/shared/api/contracts';
import { tutorialRegistry, type TutorialRegistry } from '../registry';
import { TutorialContext, type TutorialContextValue } from './tutorial-context';
import {
  isVersionOutdated,
  overallCompletion,
  pendingPrerequisites,
  prerequisitesMet,
  statusOf,
  toProgressMap,
} from './progress-helpers';
import { useProgressStore } from './use-progress-store';
import { useTutorialRun } from './use-tutorial-run';
import { useTutorialRunEffects } from './use-tutorial-run-effects';

/**
 * App-wide tutorial engine. Mounted inside the authenticated shell so it has the
 * user's role and id. Composes three focused units: the progress store
 * (backend + local fallback), the run state machine and the DOM effects.
 */
export function TutorialProvider({
  role,
  userId,
  registry = tutorialRegistry,
  children,
}: Readonly<{
  role: UserRole;
  userId: string;
  registry?: TutorialRegistry;
  children: ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const { records, source, isLoading, save, reset } = useProgressStore(userId);

  const progress = useMemo(() => toProgressMap(records), [records]);
  const tutorials = useMemo(() => registry.forRole(role), [registry, role]);

  const run = useTutorialRun({ registry, role, pathname, progress, save, reset });
  useTutorialRunEffects(run, { pathname, role, router, tutorials, progress, isLoading });

  const value: TutorialContextValue = useMemo(
    () => ({
      ready: !isLoading,
      role,
      progressSource: source,
      tutorials,
      overallPercent: overallCompletion(tutorials, progress),
      activeRun: run.activeRun,
      start: run.start,
      next: run.next,
      prev: run.prev,
      goTo: run.goTo,
      skip: run.skip,
      close: run.close,
      reset: run.reset,
      retryTarget: run.retryTarget,
      statusOf: (id) => statusOf(progress, id),
      isOutdated: (id) => {
        const tutorial = registry.get(id);
        return tutorial ? isVersionOutdated(progress[id], tutorial) : false;
      },
      prerequisitesMet: (id) => {
        const tutorial = registry.get(id);
        return tutorial ? prerequisitesMet(tutorial, progress) : true;
      },
      pendingPrerequisites: (id) => {
        const tutorial = registry.get(id);
        return tutorial ? pendingPrerequisites(tutorial, progress) : [];
      },
      repeatCountOf: (id) => progress[id]?.repeatCount ?? 0,
    }),
    [isLoading, progress, registry, role, run, source, tutorials],
  );

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}
