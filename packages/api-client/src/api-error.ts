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

  constructor(input: { message: string; status: number; requestId?: string; kind: ApiErrorKind }) {
    super(input.message);
    this.name = 'ApiError';
    this.status = input.status;
    this.requestId = input.requestId;
    this.kind = input.kind;
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
