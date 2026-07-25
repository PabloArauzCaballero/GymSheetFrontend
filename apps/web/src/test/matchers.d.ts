// Augments Vitest's Assertion with jest-dom matchers locally, so the types resolve
// regardless of how Yarn hoists `vitest` / `@testing-library/jest-dom` across the
// monorepo. The runtime augmentation is loaded in `src/test/setup.ts`.
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = unknown> extends TestingLibraryMatchers<unknown, T> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<unknown, unknown> {}
}
