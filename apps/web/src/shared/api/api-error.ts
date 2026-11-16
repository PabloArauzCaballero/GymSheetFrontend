// ApiError, status classification and problem-body parsing live in the shared
// api-client package. Re-exported so existing `@/shared/api/api-error` imports keep working unchanged.
export {
  ApiError,
  apiErrorFromProblem,
  apiErrorFromResponse,
  classifyStatus,
  fieldErrorEntries,
  isLegalAcceptanceRequired,
  type ApiErrorKind,
} from '@gymsheet/api-client';
