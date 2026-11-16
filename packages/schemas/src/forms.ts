import { z } from 'zod';

/**
 * Esquemas de los formularios de sesión, compartidos por web y móvil.
 *
 * Son la **única** definición de qué es una entrada válida en el alta y el
 * acceso. Antes la web tenía su propia copia y el móvil usaba ésta, y no
 * coincidían: la web exigía tres caracteres de nombre y el móvil dos, así que
 * «Ana» pasaba en un cliente y en el otro no, para la misma cuenta y el mismo
 * servidor. Cualquier regla nueva se escribe aquí una vez.
 *
 * Los límites replican los de `registerSchema` del backend
 * (`src/modules/auth/auth.schemas.ts`): validar más flojo que el servidor
 * convierte un error de campo —señalado y corregible— en un 400 genérico al
 * pulsar el botón.
 */

/** Longitudes del contrato del servidor. Se nombran para que no se dupliquen. */
export const authLimits = {
  emailMax: 180,
  passwordMin: 8,
  passwordMax: 128,
  fullNameMin: 3,
  fullNameMax: 180,
} as const;

const emailField = z
  .string()
  .trim()
  .min(1, 'Ingresa tu correo electrónico.')
  .email('Ingresa un correo válido.')
  .max(authLimits.emailMax, 'El correo es demasiado largo.');

const passwordField = z
  .string()
  .min(authLimits.passwordMin, `La contraseña debe tener al menos ${authLimits.passwordMin} caracteres.`)
  .max(authLimits.passwordMax, 'La contraseña es demasiado larga.');

export const loginSchema = z.object({
  email: emailField,
  password: passwordField,
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Same bounds as the backend's `adultBirthDateSchema`. */
export const SIGNUP_MIN_AGE = 18;
export const SIGNUP_MAX_AGE = 100;

/** Whole years between a `YYYY-MM-DD` birth date and `today` (local calendar). */
export function ageOn(birthDate: string, today: Date = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(birthDate);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  let age = today.getFullYear() - year;
  const beforeBirthday =
    today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day);
  if (beforeBirthday) age -= 1;
  return age;
}

const birthDateField = z
  .string()
  .min(1, 'Indica tu fecha de nacimiento.')
  .superRefine((value, context) => {
    // An empty value already failed `min(1)`; one message per problem.
    if (value === '') return;
    const age = ageOn(value);
    if (age === null) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Indica una fecha válida.' });
    else if (age < SIGNUP_MIN_AGE)
      context.addIssue({ code: z.ZodIssueCode.custom, message: `Debes tener al menos ${SIGNUP_MIN_AGE} años.` });
    else if (age > SIGNUP_MAX_AGE)
      context.addIssue({ code: z.ZodIssueCode.custom, message: `La edad no puede superar los ${SIGNUP_MAX_AGE} años.` });
  });

export const registerSchema = z
  .object({
    nombreCompleto: z
      .string()
      .trim()
      .min(authLimits.fullNameMin, 'Ingresa tu nombre completo.')
      .max(authLimits.fullNameMax, 'El nombre es demasiado largo.'),
    email: emailField,
    password: passwordField,
    confirmation: z.string(),
    /** `YYYY-MM-DD`. The app is 18+; age is derived, never asked separately. */
    fechaNacimiento: birthDateField,
    /** Mandatory at signup. `''` is only the form's initial "not chosen yet". */
    genero: z.enum(['', 'MALE', 'FEMALE']).refine((value) => value.length > 0, { message: 'Elige tu sexo.' }),
    acceptedTerms: z.boolean(),
  })
  .refine((value) => value.password === value.confirmation, {
    path: ['confirmation'],
    message: 'Las contraseñas no coinciden.',
  })
  .refine((value) => value.acceptedTerms, {
    path: ['acceptedTerms'],
    message: 'Debes aceptar los términos y la política de privacidad.',
  });
export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Valores por defecto del alta. `genero` arranca en `''` (sin elegir) y no en
 * `undefined`: un control sin valor inicial queda no controlado y el primer
 * cambio dispara el aviso de React sobre cambiar de no controlado a controlado.
 */
export const registerDefaults: RegisterInput = {
  nombreCompleto: '',
  email: '',
  password: '',
  confirmation: '',
  fechaNacimiento: '',
  genero: '',
  acceptedTerms: false,
};

export const loginDefaults: LoginInput = { email: '', password: '' };

export const recoverPasswordSchema = z.object({
  email: emailField,
});
export type RecoverPasswordInput = z.infer<typeof recoverPasswordSchema>;

/**
 * Lo que de verdad viaja a `POST /auth/register`, ya sin la confirmación ni la
 * cadena vacía del género. The BFF validates the request body with this same
 * schema, so client and server cannot drift.
 *
 * Se deriva aquí y no en cada cliente porque las dos plataformas cometían la
 * misma traducción por su cuenta —quitar `confirmation`, omitir `genero` si
 * está vacío, forzar `acceptedTerms` a `true`— y basta con que una cambie para
 * que el alta se comporte distinto según el dispositivo.
 */
export const registerPayloadSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(authLimits.emailMax),
  password: z.string().min(authLimits.passwordMin).max(authLimits.passwordMax),
  nombreCompleto: z.string().trim().min(authLimits.fullNameMin).max(authLimits.fullNameMax),
  fechaNacimiento: birthDateField,
  genero: z.enum(['MALE', 'FEMALE']),
  /** The legal version the person saw (`GET /legal/current`); the server rejects a stale one. */
  termsVersion: z.string().trim().min(1).max(20),
  acceptedTerms: z.literal(true),
});
export type RegisterPayload = z.output<typeof registerPayloadSchema>;

export function toRegisterPayload(values: RegisterInput, termsVersion: string): RegisterPayload {
  // `registerSchema` rejects an empty `genero`; reaching here without it is a bug.
  if (values.genero === '') throw new Error('toRegisterPayload called with an unvalidated form');
  const genero = values.genero;
  return {
    nombreCompleto: values.nombreCompleto.trim(),
    // Same normalization as `registerPayloadSchema` (and the backend), so the
    // payload is already in its canonical form when it leaves the client.
    email: values.email.trim().toLowerCase(),
    password: values.password,
    fechaNacimiento: values.fechaNacimiento,
    genero,
    termsVersion,
    acceptedTerms: true,
  };
}
