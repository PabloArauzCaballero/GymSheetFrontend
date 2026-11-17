import type { EntityType, HandleAvailability, HandleAvailabilityReason } from '@gymsheet/schemas';

/**
 * The public `@handle` of a business (backend ADR-0020, `handle-rules.ts`).
 * The server is the authority: these rules only spare a request for input
 * that can never be valid and word the answer the same on web and mobile.
 */

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 30;
/** Wait after the last keystroke before asking the server. */
export const HANDLE_CHECK_DEBOUNCE_MS = 400;

const FORMAT = /^[a-z0-9]+(?:[._][a-z0-9]+)*$/u;
const ONLY_DIGITS = /^[0-9._]+$/u;
// eslint-disable-next-line no-control-regex -- the range is the point: ASCII only.
const ASCII = /^[\x00-\x7f]*$/u;

/** Same normalization as the backend: trimmed, no leading `@`, NFKC, lower case. */
export function normalizeHandleInput(input: string): string {
  return input.trim().replace(/^@/u, '').normalize('NFKC').toLowerCase();
}

/** Why a handle can never be valid, before asking; null when only the server can tell. */
export type LocalHandleProblem = 'TOO_SHORT' | 'TOO_LONG' | 'CHARACTERS' | 'SEPARATORS' | 'ONLY_DIGITS';

export function localHandleProblem(handle: string): LocalHandleProblem | null {
  if (handle.length < HANDLE_MIN_LENGTH) return 'TOO_SHORT';
  if (handle.length > HANDLE_MAX_LENGTH) return 'TOO_LONG';
  if (!ASCII.test(handle) || /[^a-z0-9._]/u.test(handle)) return 'CHARACTERS';
  if (!FORMAT.test(handle)) return 'SEPARATORS';
  if (ONLY_DIGITS.test(handle)) return 'ONLY_DIGITS';
  return null;
}

export const handleCopy = {
  label: 'Tu @usuario',
  hint: 'Así te encuentran en REPP. Se publica cuando verifiquemos tu negocio.',
  checking: 'Comprobando…',
  available: (handle: string) => `@${handle} está libre.`,
  suggestionsLabel: 'Prueba con',
  checkFailed: 'No pudimos comprobarlo. Lo revisamos al guardar.',
  problems: {
    TOO_SHORT: `Usa al menos ${HANDLE_MIN_LENGTH} caracteres.`,
    TOO_LONG: `Usa como máximo ${HANDLE_MAX_LENGTH} caracteres.`,
    CHARACTERS: 'Usa solo letras sin tilde, números, punto o guion bajo.',
    SEPARATORS: 'Empieza y termina con letra o número, sin dos separadores seguidos.',
    ONLY_DIGITS: 'Añade al menos una letra.',
  } satisfies Record<LocalHandleProblem, string>,
  reasons: {
    TAKEN: 'Ese nombre ya está en uso.',
    RESERVED: 'Ese nombre está reservado.',
    INVALID: 'Usa de 3 a 30 letras, números, punto o guion bajo.',
    TOO_SIMILAR: 'Se parece demasiado a otro nombre. Prueba con otro.',
  } satisfies Record<HandleAvailabilityReason, string>,
} as const;

/** Messages of `PUT /business/me/handle` errors, by code. */
export const handleErrorMessages: Readonly<Record<string, string>> = {
  HANDLE_TAKEN: handleCopy.reasons.TAKEN,
  HANDLE_INVALID: handleCopy.reasons.INVALID,
  HANDLE_RESERVED: handleCopy.reasons.RESERVED,
  HANDLE_TOO_SIMILAR: handleCopy.reasons.TOO_SIMILAR,
  HANDLE_RENAME_LIMIT: 'Puedes cambiar tu nombre una vez cada 30 días y hasta tres veces al año.',
  BUSINESS_ACCOUNT_LOCKED: 'Tu negocio no puede cambiar de nombre en este estado.',
};

/** What the field shows while the person types. */
export type HandleCheck =
  | { state: 'idle' }
  | { state: 'invalid'; message: string }
  | { state: 'checking' }
  | { state: 'available'; handle: string }
  | { state: 'unavailable'; reason: HandleAvailabilityReason; message: string }
  | { state: 'error'; message: string };

/** The local verdict, before any request: idle (empty), invalid, or «ask the server». */
export function precheckHandle(input: string): HandleCheck | { state: 'remote'; handle: string } {
  const handle = normalizeHandleInput(input);
  if (handle === '') return { state: 'idle' };
  const problem = localHandleProblem(handle);
  return problem ? { state: 'invalid', message: handleCopy.problems[problem] } : { state: 'remote', handle };
}

/** The server's answer, worded. */
export function handleCheckFrom(result: HandleAvailability): HandleCheck {
  if (result.available && result.handle) return { state: 'available', handle: result.handle };
  const reason = result.reason ?? 'INVALID';
  return { state: 'unavailable', reason, message: handleCopy.reasons[reason] };
}

const TYPE_SUFFIX: Readonly<Record<EntityType, string>> = {
  GYM: 'gym',
  COACH: 'coach',
  CENTER: 'centro',
  STORE: 'tienda',
  SERVICE_PROVIDER: 'servicios',
};

function slugWords(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter(Boolean);
}

function fit(handle: string): string {
  return handle.slice(0, HANDLE_MAX_LENGTH).replace(/[._]+$/u, '');
}

/**
 * Handles derived from the business name, valid by format, best first:
 * `Top Fitness` → `topfitness`, `top.fitness`, `topfitness.gym`, `topfitness.<city>`.
 * The first one is the field's starting value.
 */
export function suggestHandles(businessName: string, entityType?: EntityType, city?: string): string[] {
  const words = slugWords(businessName);
  if (words.length === 0) return [];
  const joined = fit(words.join(''));
  const cityWord = city ? slugWords(city).join('') : '';
  const candidates = [
    joined,
    fit(words.join('.')),
    entityType ? fit(`${joined}.${TYPE_SUFFIX[entityType]}`) : '',
    cityWord ? fit(`${joined}.${cityWord}`) : '',
  ];
  return [...new Set(candidates)].filter((handle) => handle !== '' && localHandleProblem(handle) === null);
}
