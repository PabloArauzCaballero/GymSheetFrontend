export type ApiErrorKind =
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'rate-limit'
  | 'network'
  | 'contract'
  | 'unexpected';

export class ApiError extends Error {
  readonly status: number;
  readonly requestId?: string;
  readonly kind: ApiErrorKind;
  /** Código estable de dominio (`ROUTINE_HAS_NO_DAYS`…) cuando el backend lo declara. */
  readonly code?: string;
  readonly details?: Record<string, unknown>;
  /** First message per field of a 400, so forms can show each one next to its input. */
  readonly fieldErrors: Readonly<Record<string, string>>;

  constructor(input: {
    message: string;
    status: number;
    requestId?: string;
    kind: ApiErrorKind;
    code?: string;
    details?: Record<string, unknown>;
    fieldErrors?: Record<string, string>;
  }) {
    super(input.message);
    this.name = 'ApiError';
    this.status = input.status;
    this.requestId = input.requestId;
    this.kind = input.kind;
    this.code = input.code;
    this.details = input.details;
    this.fieldErrors = input.fieldErrors ?? {};
  }
}

export function classifyStatus(status: number): ApiErrorKind {
  if (status === 400 || status === 422) return 'validation';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  if (status === 409) return 'conflict';
  if (status === 429) return 'rate-limit';
  return 'unexpected';
}
