import { describe, expect, it } from 'vitest';
import { chatDotFigure, chatShouldPulse, chatWaitingLabel } from './chat-waiting';

describe('chat waiting dot', () => {
  it('names chats, singular and plural, and stays silent at zero', () => {
    expect(chatWaitingLabel(0)).toBeNull();
    expect(chatWaitingLabel(1)).toBe('1 chat espera tu respuesta');
    expect(chatWaitingLabel(3)).toBe('3 chats esperan tu respuesta');
  });

  it('caps the figure at 9+', () => {
    expect(chatDotFigure(4)).toBe('4');
    expect(chatDotFigure(12)).toBe('9+');
  });

  it('pulses only when the count rises after a first read', () => {
    expect(chatShouldPulse(null, 3)).toBe(false);
    expect(chatShouldPulse(2, 3)).toBe(true);
    expect(chatShouldPulse(3, 3)).toBe(false);
    expect(chatShouldPulse(3, 1)).toBe(false);
  });
});
