import { describe, expect, it } from 'vitest';
import { safeHref } from './safe-href';

describe('safeHref', () => {
  it('keeps http(s) URLs and same-origin paths', () => {
    expect(safeHref('https://open.spotify.com/playlist/1')).toBe('https://open.spotify.com/playlist/1');
    expect(safeHref('http://example.test/a')).toBe('http://example.test/a');
    expect(safeHref('/api/media?url=x')).toBe('/api/media?url=x');
  });

  it('drops every other scheme and protocol-relative targets', () => {
    for (const unsafe of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,<b>x</b>', 'vbscript:x', '//evil.test', '/\\evil.test', 'not a url', '', null, undefined]) {
      expect(safeHref(unsafe)).toBeUndefined();
    }
  });
});
