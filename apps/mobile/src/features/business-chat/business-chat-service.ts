import { createBusinessChatServices } from '@gymsheet/api-client';
import { apiClient } from '@/api/client';

/** Chat with businesses (ADR-0023): the same shared services as the web. */
export const businessChatService = createBusinessChatServices(apiClient.request);
