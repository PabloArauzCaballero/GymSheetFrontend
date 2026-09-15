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
    /**
     * Cadena vacía = prefiero no decirlo, tratada igual que ausencia: solo
     * sirve para elegir con qué arquetipos habla la senda.
     */
    genero: z.enum(['', 'MALE', 'FEMALE', 'UNSPECIFIED']),
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
 * Valores por defecto del alta. Viven junto al esquema porque `genero` tiene
 * que arrancar en `''` —la opción «prefiero no decirlo»— y no en `undefined`:
 * un `<select>` sin valor inicial queda no controlado y el primer cambio
 * dispara el aviso de React sobre cambiar de no controlado a controlado.
 */
export const registerDefaults: RegisterInput = {
  nombreCompleto: '',
  email: '',
  password: '',
  confirmation: '',
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
 * cadena vacía del género.
 *
 * Se deriva aquí y no en cada cliente porque las dos plataformas cometían la
 * misma traducción por su cuenta —quitar `confirmation`, omitir `genero` si
 * está vacío, forzar `acceptedTerms` a `true`— y basta con que una cambie para
 * que el alta se comporte distinto según el dispositivo.
 */
export type RegisterPayload = {
  email: string;
  password: string;
  nombreCompleto: string;
  genero?: 'MALE' | 'FEMALE' | 'UNSPECIFIED';
  acceptedTerms: true;
};

export function toRegisterPayload(values: RegisterInput): RegisterPayload {
  return {
    nombreCompleto: values.nombreCompleto.trim(),
    email: values.email.trim(),
    password: values.password,
    // Literal `true` y no `values.acceptedTerms`: el esquema ya ha rechazado el
    // caso contrario, y el tipo del backend exige el literal.
    acceptedTerms: true,
    ...(values.genero === '' ? {} : { genero: values.genero }),
  };
}
