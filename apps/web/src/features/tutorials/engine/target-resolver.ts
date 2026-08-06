/**
 * Resolves tutorial targets by their stable `data-tutorial-id` attribute.
 * Never relies on CSS class selectors (which are fragile / restyled). Targets
 * may appear asynchronously — after a fetch, inside a modal, a dropdown or a
 * table row — so resolution waits with a MutationObserver plus a bounded
 * timeout and reports failure gracefully instead of throwing.
 */

const ATTRIBUTE = 'data-tutorial-id';

function escapeAttrValue(value: string): string {
  // CSS.escape is available in every browser that runs this app; fall back to a
  // conservative manual escape in non-DOM/test environments.
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  return value.replace(/["\\]/g, '\\$&');
}

export function tutorialSelector(id: string): string {
  return `[${ATTRIBUTE}="${escapeAttrValue(id)}"]`;
}

/** True when the element is actually laid out and visible to the user. */
export function isElementVisible(element: HTMLElement): boolean {
  if (!element.isConnected) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  const style = window.getComputedStyle(element);
  return style.visibility !== 'hidden' && style.display !== 'none';
}

export function findTarget(id: string, root: ParentNode = document): HTMLElement | null {
  // A stable id can legitimately appear more than once in the DOM (e.g. a nav
  // link rendered in both the desktop sidebar and the mobile strip). Return the
  // first one that is actually visible for the current viewport.
  const matches = root.querySelectorAll<HTMLElement>(tutorialSelector(id));
  for (const element of matches) {
    if (isElementVisible(element)) return element;
  }
  return null;
}

export type WaitForTargetOptions = {
  timeoutMs?: number;
  signal?: AbortSignal;
};

/**
 * Resolves with the visible target element, or `null` if it does not appear
 * within `timeoutMs` (default 4000ms) or the wait is aborted. Only rejects if
 * called outside a DOM environment.
 */
export function waitForTarget(
  id: string,
  { timeoutMs = 4000, signal }: WaitForTargetOptions = {},
): Promise<HTMLElement | null> {
  if (typeof document === 'undefined') return Promise.resolve(null);

  const immediate = findTarget(id);
  if (immediate) return Promise.resolve(immediate);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (element: HTMLElement | null) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      window.clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve(element);
    };

    const check = () => {
      const element = findTarget(id);
      if (element) finish(element);
    };

    const onAbort = () => finish(null);
    const observer = new MutationObserver(check);
    const timer = window.setTimeout(() => finish(null), timeoutMs);

    if (signal?.aborted) {
      finish(null);
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [ATTRIBUTE, 'style', 'class', 'hidden'],
    });
    // A late layout pass can make an already-present node visible without a
    // mutation; re-check on the next frame as a safety net.
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(check);
  });
}
