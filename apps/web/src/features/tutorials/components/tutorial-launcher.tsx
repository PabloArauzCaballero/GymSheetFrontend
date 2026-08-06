'use client';

import { HelpCircle } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { buttonClasses } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/cn';
import { TUTORIAL_CENTER_ROUTE } from '../constants';
import { useTutorial } from '../engine/tutorial-context';

/**
 * Header entry point ("?"). Starts the tutorial that matches the current page
 * when there is one; otherwise opens the Tutorial Center. Kept out of the way
 * and reuses the app's ghost icon-button styling.
 */
export function TutorialLauncher() {
  const { tutorials, start } = useTutorial();
  const router = useRouter();
  const pathname = usePathname();

  const pageTutorial = tutorials.find((tutorial) => tutorial.route === pathname);

  return (
    <button
      type="button"
      data-tutorial-id="help-launcher"
      aria-label={
        pageTutorial ? `Iniciar guía: ${pageTutorial.title}` : 'Abrir el Centro de ayuda'
      }
      title="Centro de ayuda"
      className={cn(buttonClasses('ghost', 'icon'))}
      onClick={() => {
        if (pageTutorial) start(pageTutorial.id);
        else router.push(TUTORIAL_CENTER_ROUTE);
      }}
    >
      <HelpCircle aria-hidden className="size-5" />
    </button>
  );
}
