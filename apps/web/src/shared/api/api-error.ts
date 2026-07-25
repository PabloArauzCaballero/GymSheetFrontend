// ApiError + status classification now live in the shared api-client package.
// Re-exported so existing `@/shared/api/api-error` imports keep working unchanged.
export { ApiError, classifyStatus, type ApiErrorKind } from '@gymsheet/api-client';
