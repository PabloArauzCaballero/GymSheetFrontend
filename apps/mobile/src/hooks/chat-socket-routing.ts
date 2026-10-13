export function isForActiveConversation(
  event: { conversationId?: string | null },
  activeConversationId: string | null,
): boolean {
  return Boolean(activeConversationId && event.conversationId === activeConversationId);
}
