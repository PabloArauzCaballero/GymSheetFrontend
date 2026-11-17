import { businessChatBlockSchema, businessConversationSchema } from '@gymsheet/schemas';
import type { RequestFn } from './routine-services';

/**
 * Chat with businesses (ADR-0023). A person opens (or gets back) its chat with
 * a public listing; the business blocks a person from one of its chats. Once
 * open, both sides read and answer through `/me/conversations/*`.
 */
export function createBusinessChatServices(request: RequestFn) {
  return {
    /** Person only, verified email. 201 opened now / 200 the live one; 403/404/429 carry the codes of `businessChatFailure`. */
    open: (entityId: string) =>
      request('/me/business-conversations', businessConversationSchema, { method: 'POST', body: { entityId } }),
    /** Business only: revokes the conversation and stops the person from opening another. Idempotent. */
    block: (conversationId: string) =>
      request(`/business/me/conversations/${encodeURIComponent(conversationId)}/block`, businessChatBlockSchema, { method: 'POST' }),
  };
}
