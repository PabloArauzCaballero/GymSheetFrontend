// Contracts now live in the shared workspace package (single source of truth for
// web and mobile). This barrel re-exports them so existing `@/shared/api/contracts`
// imports keep working unchanged.
export * from '@gymsheet/types';
