import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';
import type { AccessCredential, AccessDecision, Page } from '@/shared/api/contracts';
import { accessDecisionSchema, credentialSchema, pageSchema } from '@/shared/api/schemas';

export const accessService = {
  getHistory: (page = 1) =>
    apiRequest<Page<AccessDecision>>(
      `/access/me?page=${page}&pageSize=25`,
      pageSchema(accessDecisionSchema),
    ),
  getCredentials: () =>
    apiRequest<AccessCredential[]>('/access/credentials/me', z.array(credentialSchema)),
};
