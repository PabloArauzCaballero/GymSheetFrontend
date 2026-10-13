/** Keep stories paused after leaving the foreground until the user resumes. */
export function storyManualPauseAfterAppStateChange(
  currentlyPaused: boolean,
  nextAppState: string,
): boolean {
  return currentlyPaused || nextAppState !== 'active';
}
