import { z } from 'zod';

/**
 * Platform-agnostic form schemas shared by the web and mobile clients.
 * They validate user input before it reaches the API layer, independent of
 * the UI framework (react-hook-form on web, react-hook-form on Expo).
 */
export const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  nombreCompleto: z.string().min(2, 'Ingresa tu nombre completo.'),
  email: z.string().email('Correo electrónico inválido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const recoverPasswordSchema = z.object({
  email: z.string().email('Correo electrónico inválido.'),
});
export type RecoverPasswordInput = z.infer<typeof recoverPasswordSchema>;
