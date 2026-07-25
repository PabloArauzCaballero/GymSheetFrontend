// Date/duration formatting now lives in the shared domain package.
// Re-exported so existing `@/shared/lib/date` imports keep working unchanged.
export { formatDate, formatDateTime, formatDuration } from '@gymsheet/domain';
