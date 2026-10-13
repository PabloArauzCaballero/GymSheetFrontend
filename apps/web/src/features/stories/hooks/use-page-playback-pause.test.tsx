import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePagePlaybackPause } from './use-page-playback-pause';

describe('usePagePlaybackPause', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pauses when the page is hidden and does not resume when it becomes visible', () => {
    const visibility = { value: 'visible' as DocumentVisibilityState };
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility.value);
    const { result } = renderHook(() => usePagePlaybackPause());

    expect(result.current.paused).toBe(false);
    act(() => {
      visibility.value = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current.paused).toBe(true);

    act(() => {
      visibility.value = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current.paused).toBe(true);
    act(() => result.current.resume());
    expect(result.current.paused).toBe(false);
  });

  it('pauses on pagehide', () => {
    const { result } = renderHook(() => usePagePlaybackPause());

    act(() => window.dispatchEvent(new Event('pagehide')));

    expect(result.current.paused).toBe(true);
  });
});
