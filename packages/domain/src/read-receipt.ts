/**
 * A read receipt is visible only inside the enabled interval. The lower bound
 * prevents a later opt-in from making messages read before that choice appear
 * blue retroactively.
 */
export function isMessageReadByOther(
  messageCreatedAt: string,
  readAt: string | null,
  enabledSince: string | null,
): boolean {
  if (!readAt) return false;
  const messageTime = Date.parse(messageCreatedAt);
  const readTime = Date.parse(readAt);
  const enabledTime = enabledSince === null ? Number.NEGATIVE_INFINITY : Date.parse(enabledSince);
  if (!Number.isFinite(messageTime) || !Number.isFinite(readTime) ||
      enabledSince !== null && !Number.isFinite(enabledTime)) return false;
  return messageTime <= readTime && messageTime >= enabledTime;
}
