import { z } from 'zod';

/** `POST /me/business-conversations` (ADR-0023): 201 opened now, 200 the live one already existed. */
export const businessConversationSchema = z.object({ conversationId: z.string().uuid() });
export type BusinessConversation = z.infer<typeof businessConversationSchema>;

/** `POST /business/me/conversations/:id/block`: idempotent; the conversation is revoked. */
export const businessChatBlockSchema = z.object({ conversationId: z.string().uuid(), blocked: z.literal(true) });
export type BusinessChatBlock = z.infer<typeof businessChatBlockSchema>;
