import { afterEach, describe, expect, it } from 'vitest';
import { findTarget, isElementVisible, tutorialSelector, waitForTarget } from './target-resolver';

// jsdom has no layout engine, so getBoundingClientRect returns zeros. Stub a
// non-empty rect to simulate a laid-out, visible element.
function makeVisible(element: HTMLElement) {
  element.getBoundingClientRect = () =>
    ({ width: 120, height: 24, top: 0, left: 0, right: 120, bottom: 24, x: 0, y: 0, toJSON() {} }) as DOMRect;
}

function addTarget(id: string, visible = true): HTMLElement {
  const element = document.createElement('button');
  element.setAttribute('data-tutorial-id', id);
  if (visible) makeVisible(element);
  document.body.append(element);
  return element;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('target-resolver', () => {
  it('builds an escaped attribute selector', () => {
    expect(tutorialSelector('nav:/x')).toContain('data-tutorial-id=');
  });

  it('finds a present, visible target', () => {
    const element = addTarget('a');
    expect(findTarget('a')).toBe(element);
  });

  it('ignores a zero-size (hidden) target', () => {
    addTarget('a', false);
    expect(findTarget('a')).toBeNull();
  });

  it('returns the first visible match when duplicated', () => {
    addTarget('dup', false); // hidden (e.g. desktop nav on mobile)
    const visible = addTarget('dup', true);
    expect(findTarget('dup')).toBe(visible);
  });

  it('resolves immediately when the target already exists', async () => {
    const element = addTarget('now');
    await expect(waitForTarget('now', { timeoutMs: 100 })).resolves.toBe(element);
  });

  it('resolves when the target appears asynchronously', async () => {
    const pending = waitForTarget('later', { timeoutMs: 1000 });
    setTimeout(() => addTarget('later'), 20);
    const resolved = await pending;
    expect(resolved?.getAttribute('data-tutorial-id')).toBe('later');
  });

  it('resolves null when the target never appears', async () => {
    await expect(waitForTarget('ghost', { timeoutMs: 60 })).resolves.toBeNull();
  });

  it('resolves null when aborted', async () => {
    const controller = new AbortController();
    const pending = waitForTarget('ghost', { timeoutMs: 1000, signal: controller.signal });
    controller.abort();
    await expect(pending).resolves.toBeNull();
  });

  it('isElementVisible reflects connection and size', () => {
    const element = addTarget('vis');
    expect(isElementVisible(element)).toBe(true);
    element.remove();
    expect(isElementVisible(element)).toBe(false);
  });
});
