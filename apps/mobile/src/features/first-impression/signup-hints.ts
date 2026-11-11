import { authLimits } from '@gymsheet/schemas';

/**
 * Ayudas del alta que responden mientras se escribe, sin esperar al envío
 * (skill `signup`: «show requirements upfront», «check for common typos»).
 * Lógica pura: la pantalla solo la pinta. Nada de esto valida — la validación
 * sigue siendo `registerSchema`; esto adelanta lo que el esquema dirá.
 */

/** Dominios de correo personales más comunes; contra ellos se buscan erratas. */
const KNOWN_DOMAINS = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'icloud.com',
  'live.com',
  'protonmail.com',
] as const;

/** Distancia de edición (Levenshtein) acotada: cadenas cortas, sin reservar matrices. */
function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, (previous[j - 1] ?? 0) + cost);
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}

/**
 * «pablo@gmial.com» → «pablo@gmail.com». Devuelve `null` si el dominio ya es
 * uno conocido, si no se parece a ninguno (un correo de empresa es válido) o
 * si el correo aún no tiene la forma `algo@dominio.tld`.
 */
export function emailTypoSuggestion(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0) return null;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (!domain.includes('.') || domain.endsWith('.')) return null;
  if ((KNOWN_DOMAINS as readonly string[]).includes(domain)) return null;

  let best: { domain: string; distance: number } | null = null;
  for (const known of KNOWN_DOMAINS) {
    const distance = editDistance(domain, known);
    if (distance > 0 && distance <= 2 && (!best || distance < best.distance)) best = { domain: known, distance };
  }
  return best ? `${local}@${best.domain}` : null;
}

export type PasswordChecks = {
  /** Cumple el mínimo de `registerSchema`. */
  longEnough: boolean;
  /** La confirmación coincide; `null` mientras no se ha escrito nada en ella. */
  matches: boolean | null;
};

export function passwordChecks(password: string, confirmation: string): PasswordChecks {
  return {
    longEnough: password.length >= authLimits.passwordMin,
    matches: confirmation.length === 0 ? null : confirmation === password,
  };
}
