import { useQuery } from '@tanstack/react-query';
import { socialService } from '@/api/services';
import { ChatDot } from '@/components/chat-dot';
import { colors } from '@/theme';
import { useChatWaiting } from './use-chat-waiting';

/** Connection requests I have not answered: same key as the Solicitudes view. */
export function useReceivedRequests() {
  const pending = useQuery({ queryKey: ['social', 'connections', 'PENDING'], queryFn: () => socialService.listConnections('PENDING'), staleTime: 60_000 });
  return (pending.data ?? []).filter((connection) => connection.direction === 'RECEIVED').length;
}

/**
 * The glowing dot on the Mensajes tab: chats waiting for my reply plus
 * requests to answer, at the icon's top-right tip. It pulses when the chat
 * count rises, then settles; nothing waiting, no dot.
 */
export function ChatTabDot() {
  const waiting = useChatWaiting();
  const total = waiting.count + useReceivedRequests();
  if (total <= 0) return null;
  return <ChatDot count={total} halo={colors.surfaceHigh} pulseKey={waiting.pulseKey} style={{ position: 'absolute', top: -6, right: -10 }} />;
}
