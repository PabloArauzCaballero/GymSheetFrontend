import { createBusinessChatServices } from '@gymsheet/api-client';
import { apiRequest } from '@/shared/api/api-client';

/** Chat with businesses (ADR-0023) through the BFF: the same shared services as the mobile app. */
export const businessChatService = createBusinessChatServices(apiRequest);
