import { theme } from '@gymsheet/design-tokens';

/**
 * Re-exports the shared design tokens so the whole app imports the visual
 * identity from one place. The values match the web app's CSS variables.
 */
export { colors, spacing, radii, fontSizes, fontWeights, minTouchTarget } from '@gymsheet/design-tokens';
export { theme };
export type { Theme } from '@gymsheet/design-tokens';
