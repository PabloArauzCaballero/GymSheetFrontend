import { describe, expect, it } from 'vitest';
import type { BrowserPushSnapshot } from './web-push-browser-store';
import { resolveWebPushState } from './web-push-state';

const enabled = { enabled: true };
const browser = (overrides: Partial<BrowserPushSnapshot> = {}): BrowserPushSnapshot => ({
  supported: true,
  permission: 'default',
  subscribed: false,
  ...overrides,
});

describe('resolveWebPushState', () => {
  it('stays in checking until the browser answers and the config arrives', () => {
    expect(resolveWebPushState(null, enabled)).toBe('checking');
    expect(resolveWebPushState(browser(), undefined)).toBe('checking');
  });

  it('reports an unsupported browser before anything else', () => {
    expect(resolveWebPushState(browser({ supported: false }), enabled)).toBe('unsupported');
    expect(resolveWebPushState(browser({ supported: false }), { enabled: false })).toBe(
      'unsupported',
    );
  });

  it('separates "this deployment has no web push" from "your browser blocked it"', () => {
    expect(resolveWebPushState(browser(), { enabled: false })).toBe('unavailable');
    expect(resolveWebPushState(browser({ permission: 'denied' }), enabled)).toBe('denied');
  });

  it('offers to subscribe when everything is ready and permission was never asked', () => {
    expect(resolveWebPushState(browser(), enabled)).toBe('idle');
    expect(resolveWebPushState(browser({ permission: 'granted' }), enabled)).toBe('idle');
  });

  it('still offers to unsubscribe when a live subscription outlived the permission', () => {
    expect(resolveWebPushState(browser({ subscribed: true, permission: 'denied' }), enabled)).toBe(
      'subscribed',
    );
  });
});
