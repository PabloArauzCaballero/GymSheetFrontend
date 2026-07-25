'use client';

import { usePathname } from 'next/navigation';

/**
 * Thin volt bar that replays a quick sweep on every route change to confirm
 * navigation. State-free: the `key` on the inner span remounts it on each
 * pathname change, so the CSS animation restarts. Purely decorative.
 * Immediate click feedback lives in the nav links (useLinkStatus).
 */
export function RouteProgress() {
  const pathname = usePathname();
  return (
    <div aria-hidden className="route-progress-bar">
      <span key={pathname} />
    </div>
  );
}
