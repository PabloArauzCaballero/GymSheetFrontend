'use client';

import { useEffect, useState } from 'react';

/** Pause story playback once the document leaves the foreground. Returning to
 * the page does not resume playback; the user must explicitly press play. */
export function usePagePlaybackPause(): { paused: boolean; resume: () => void } {
  const [pausedAfterBackground, setPausedAfterBackground] = useState(false);

  useEffect(() => {
    const pause = () => setPausedAfterBackground(true);
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') pause();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', pause);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', pause);
    };
  }, []);

  return { paused: pausedAfterBackground, resume: () => setPausedAfterBackground(false) };
}
