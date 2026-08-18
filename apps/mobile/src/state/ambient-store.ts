import { create } from 'zustand';

/**
 * How alive the backdrop should be.
 *
 * The brief pulled in two directions: the background had to feel premium, and
 * it had to feel like a training app. Those are opposite instincts — restraint
 * versus energy — and picking one permanently is what made every previous
 * attempt wrong for half the app.
 *
 * So it is contextual instead. `calm` is the default: quiet enough to sit
 * behind a membership screen without competing with it. `active` is what a
 * session in progress switches it to, where a faster, larger wave reads as
 * effort rather than decoration. The same surface, two registers.
 */
export type AmbientIntensity = 'calm' | 'active';

interface AmbientState {
  intensity: AmbientIntensity;
  setIntensity: (next: AmbientIntensity) => void;
}

export const useAmbientStore = create<AmbientState>((set) => ({
  intensity: 'calm',
  setIntensity: (intensity) => set({ intensity }),
}));
