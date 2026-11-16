import { alpha, darkSurfaces, ink } from '@/theme';

export const SCRIM_BOTTOM = [
  'transparent',
  alpha(darkSurfaces.night, 0.25),
  alpha(darkSurfaces.night, 0.72),
  alpha(darkSurfaces.night, 0.96),
] as const;
export const SCRIM_BOTTOM_STOPS = [0, 0.35, 0.7, 1] as const;
export const SCRIM_TOP = [alpha(ink.black, 0.45), 'transparent'] as const;
