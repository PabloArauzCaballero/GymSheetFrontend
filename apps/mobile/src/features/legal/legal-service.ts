import {
  currentLegalDocumentsSchema,
  pendingLegalDocumentsSchema,
  type LegalDocumentVersion,
} from '@gymsheet/schemas';
import { apiClient } from '@/api/client';

export const legalQueryKeys = {
  current: ['legal', 'current'] as const,
  pending: ['legal', 'pending'] as const,
};

export const legalService = {
  /** Public: the signup needs the current versions before any session exists. */
  async current(): Promise<LegalDocumentVersion[]> {
    return (await apiClient.request('/legal/current', currentLegalDocumentsSchema, { method: 'GET' })).documents;
  },
  async pending(): Promise<LegalDocumentVersion[]> {
    return (await apiClient.request('/me/legal/pending', pendingLegalDocumentsSchema, { method: 'GET' })).pending;
  },
  /** Idempotent on the server; answers what is still pending. */
  async accept(acceptances: readonly LegalDocumentVersion[]): Promise<LegalDocumentVersion[]> {
    const result = await apiClient.request('/me/legal/accept', pendingLegalDocumentsSchema, {
      method: 'POST',
      body: { acceptances },
    });
    return result.pending;
  },
};
