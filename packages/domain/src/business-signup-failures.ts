import { accountSanctionMessage } from './account-sanction';
import { authErrorMessage } from './auth-options';
import { businessSignupErrorMessage } from './business-onboarding';

export const businessAccountFields = ['businessName', 'email', 'password'] as const;
export type BusinessAccountField = (typeof businessAccountFields)[number];
export type BusinessSignupFailure = { field: BusinessAccountField | 'root'; message: string };

/** The parts of an `ApiError` this needs, read structurally so the domain stays transport-free. */
type ErrorShape = { code?: unknown; kind?: unknown; message?: unknown; fieldErrors?: Record<string, string | undefined> };

/**
 * Where a refused `POST /business/signup` is shown, on web and mobile: next to
 * the field it is about (a taken email, the per-field messages of a 400) or
 * above the button. `SIGNUP_REJECTED` stays generic on purpose: never the reason.
 */
export function businessSignupFailures(error: unknown): BusinessSignupFailure[] {
  const shape = (typeof error === 'object' && error !== null ? error : {}) as ErrorShape;
  const code = typeof shape.code === 'string' ? shape.code : undefined;
  const known = businessSignupErrorMessage(code);
  if (code === 'EMAIL_ALREADY_REGISTERED' && known) return [{ field: 'email', message: known }];
  if (known) return [{ field: 'root', message: known }];
  const sanction = accountSanctionMessage(error);
  if (sanction) return [{ field: 'root', message: sanction }];
  const fields = businessAccountFields.flatMap((field) => {
    const message = shape.fieldErrors?.[field];
    return message ? [{ field, message }] : [];
  });
  if (fields.length > 0) return fields;
  // Only a classified API failure may carry the server's wording; a thrown TypeError never does.
  const kind = typeof shape.kind === 'string' ? shape.kind : undefined;
  const serverMessage = kind && typeof shape.message === 'string' ? shape.message : undefined;
  return [{ field: 'root', message: authErrorMessage(kind, 'register', serverMessage) }];
}
