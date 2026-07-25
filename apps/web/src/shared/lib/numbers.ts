// Number formatting now lives in the shared domain package.
// Re-exported so existing `@/shared/lib/numbers` imports keep working unchanged.
export { formatNumber, numberFormatter } from '@gymsheet/domain';
