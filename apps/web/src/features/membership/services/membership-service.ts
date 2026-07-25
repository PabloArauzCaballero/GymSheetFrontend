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
};
