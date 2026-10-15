import { describe, expect, it } from 'vitest';
import { canSubmitStoryAudience } from './story-audience-selection';

describe('canSubmitStoryAudience', () => {
  it('allows all accepted connections without waiting for the recipient query', () => {
    expect(canSubmitStoryAudience('ALL_CONNECTIONS', [], 'loading')).toBe(true);
    expect(canSubmitStoryAudience('ALL_CONNECTIONS', [], 'error')).toBe(true);
  });

  it('blocks selected recipients until loading succeeds and a recipient is chosen', () => {
    expect(canSubmitStoryAudience('SELECTED_CONNECTIONS', ['user-1'], 'loading')).toBe(false);
    expect(canSubmitStoryAudience('SELECTED_CONNECTIONS', ['user-1'], 'error')).toBe(false);
    expect(canSubmitStoryAudience('SELECTED_CONNECTIONS', [], 'loaded')).toBe(false);
    expect(canSubmitStoryAudience('SELECTED_CONNECTIONS', ['user-1'], 'loaded')).toBe(true);
  });
});
