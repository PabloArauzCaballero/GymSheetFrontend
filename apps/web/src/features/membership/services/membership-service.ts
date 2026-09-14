import { apiRequest } from '@/shared/api/api-client';
import { z } from 'zod';
import type {
  MembershipAccess,
  MembershipIntent,
  MembershipOptions,
  MembershipPlan,
  MembershipProjection,
} from '@/shared/api/contracts';
import {
  activationRequestSchema,
  membershipAccessSchema,
  membershipIntentSchema,
  membershipOptionsSchema,
  membershipPlanSchema,
  membershipProjectionSchema,
} from '@/shared/api/schemas';

export const membershipService = {
  getMine: () => apiRequest<MembershipProjection>('/me/membership', membershipProjectionSchema),
  getAccesses: () =>
    apiRequest<MembershipAccess[]>('/me/accesses', z.array(membershipAccessSchema)),
  getOptions: () =>
    apiRequest<MembershipOptions>('/me/membership/options', membershipOptionsSchema),
  listPlans: () => apiRequest<MembershipPlan[]>('/membership/plans', z.array(membershipPlanSchema)),
  renewalIntent: (input: { planId: string; months: number; idempotencyKey: string }) =>
    apiRequest<MembershipIntent>('/me/membership/renewal-intent', membershipIntentSchema, {
      method: 'POST',
      body: input,
    }),
  extensionIntent: (input: { planId: string; months: number; idempotencyKey: string }) =>
    apiRequest<MembershipIntent>('/me/membership/extension-intent', membershipIntentSchema, {
      method: 'POST',
      body: input,
    }),
  /**
   * Pide que el gimnasio active la cuenta tras un pago que la aplicación no vio.
   *
   * Devuelve el enlace ya compuesto que abrirá el personal del gimnasio. El
   * cliente no lo interpreta: sólo lo mete en el mensaje, porque quién puede
   * usarlo lo decide el backend y no este navegador. Mismo endpoint y mismo
   * contrato que el móvil.
   */
  requestActivation: (nota: string | null) =>
    apiRequest('/me/membership/activation-request', activationRequestSchema, {
      method: 'POST',
      body: { nota },
    }),
};
