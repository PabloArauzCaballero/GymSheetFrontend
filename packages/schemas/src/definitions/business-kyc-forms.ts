import { z } from 'zod';
import { ciExtensions, type KycDraftPatch } from './business-kyc';

/**
 * Forms of the KYC steps 4–5 (plan §4.1), validated live with the same shape
 * rules as the backend (`kyc-formats.ts`): only the SHAPE, never a check digit.
 * A NIT or CI already saved comes back masked, so the field may stay empty.
 */

const compact = (value: string) => value.replace(/[\s().-]/gu, '');

/** Bolivian mobile in E.164 (`+591` and 8 digits starting 6 or 7), or null. Same rule as the backend. */
export function normalizeBolivianMobile(input: string): string | null {
  const match = /^(?:\+?591)?([67]\d{7})$/u.exec(compact(input));
  return match ? `+591${match[1]}` : null;
}

export const kycPhoneFormSchema = z.object({
  phone: z.string().refine((value) => normalizeBolivianMobile(value) !== null, {
    message: 'Escribe un celular de Bolivia: 8 dígitos que empiezan con 6 o 7.',
  }),
});
export type KycPhoneForm = z.infer<typeof kycPhoneFormSchema>;

export const kycCodeFormSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/u, 'El código tiene 6 dígitos.'),
});
export type KycCodeForm = z.infer<typeof kycCodeFormSchema>;

const NIT = /^\d{7,13}$/u;
const CI = /^\d{4,10}$/u;

function secret(saved: boolean, pattern: RegExp, required: string, format: string, strip: RegExp) {
  return z
    .string()
    .transform((value) => value.replace(strip, ''))
    .refine((value) => (value === '' ? saved : true), { message: required })
    .refine((value) => value === '' || pattern.test(value), { message: format });
}

export function kycCompanyFormSchema(savedNit: boolean) {
  return z.object({
    legalName: z.string().trim().min(2, 'Escribe la razón social.').max(200, 'Es demasiado larga.'),
    nit: secret(savedNit, NIT, 'Escribe el NIT.', 'Solo números, de 7 a 13 dígitos.', /[\s.-]/gu),
    address: z.string().trim().min(5, 'Escribe la dirección.').max(500, 'Es demasiado larga.'),
    seprecNumber: z.string().trim().max(40, 'Es demasiado larga.'),
  });
}
export type KycCompanyForm = z.infer<ReturnType<typeof kycCompanyFormSchema>>;

const ciFields = (savedCi: boolean) => ({
  repFullName: z.string().trim().min(3, 'Escribe el nombre completo.').max(180, 'Es demasiado largo.'),
  repCiNumber: secret(savedCi, CI, 'Escribe el número de carnet.', 'De 4 a 10 dígitos.', /[\s.]/gu),
  repCiComplement: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => value === '' || /^[0-9A-Z]{2}$/u.test(value), { message: '2 letras o números.' }),
  repCiExtension: z.enum(['', ...ciExtensions]),
});

export function kycRepresentativeFormSchema(savedCi: boolean) {
  return z.object(ciFields(savedCi));
}
export type KycRepresentativeForm = z.infer<ReturnType<typeof kycRepresentativeFormSchema>>;

export function kycPersonFormSchema(savedCi: boolean) {
  return z.object({
    ...ciFields(savedCi),
    specialty: z.string().trim().min(2, 'Escribe tu especialidad.').max(120, 'Es demasiado larga.'),
  });
}
export type KycPersonForm = z.infer<ReturnType<typeof kycPersonFormSchema>>;

export const kycBusinessChangeFormSchema = z.object({
  tradeName: z.string().trim().min(2, 'Escribe el nombre de tu negocio.').max(180, 'Es demasiado largo.'),
  primaryCategoryId: z.string().uuid('Elige una categoría.'),
});
export type KycBusinessChangeForm = z.infer<typeof kycBusinessChangeFormSchema>;

const orNull = (value: string) => (value.trim() === '' ? null : value.trim());

/** The draft patch of one legal part: a NIT or CI is sent only when typed (the saved one stays). */
export function companyDraftPatch(values: KycCompanyForm): KycDraftPatch {
  return {
    legalName: values.legalName,
    address: values.address,
    seprecNumber: orNull(values.seprecNumber),
    ...(values.nit ? { nit: values.nit } : {}),
  };
}

export function representativeDraftPatch(values: KycRepresentativeForm | KycPersonForm): KycDraftPatch {
  return {
    repFullName: values.repFullName,
    repCiComplement: orNull(values.repCiComplement),
    repCiExtension: values.repCiExtension === '' ? null : values.repCiExtension,
    ...(values.repCiNumber ? { repCiNumber: values.repCiNumber } : {}),
    ...('specialty' in values ? { specialty: values.specialty } : {}),
  };
}
