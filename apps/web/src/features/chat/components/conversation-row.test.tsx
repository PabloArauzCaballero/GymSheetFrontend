import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ConversationSummary } from '@/shared/api/schemas';
import { ConversationRow } from './conversation-row';

vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

const conversation: ConversationSummary = {
  conversationId: '00000000-0000-4000-8000-000000000001',
  otherUserId: '00000000-0000-4000-8000-000000000002',
  otherUserName: 'Gimnasio Norte',
  otherUserPhotoUrl: null,
  otherUserOnline: false,
  otherUserLastSeenAt: null,
  lastMessage: 'Sí: 250 Bs al mes.',
  lastMessageAt: null,
  canWrite: true,
  systemKind: null,
  kind: 'BUSINESS',
  nickname: null,
  otherUserLastDeliveredAt: null,
  otherUserLastReadAt: null,
  otherUserReadReceiptsSinceAt: null,
};

describe('ConversationRow with a business', () => {
  it('marks an open business chat «Negocio»', () => {
    render(<ul><ConversationRow conversation={conversation} /></ul>);
    expect(screen.getByText('Negocio', { exact: true })).toBeInTheDocument();
  });

  it('marks a closed business «Negocio cerrado» (ADR-0028)', () => {
    render(<ul><ConversationRow conversation={{ ...conversation, businessClosed: true, canWrite: false }} /></ul>);
    expect(screen.getByText('Negocio cerrado', { exact: true })).toBeInTheDocument();
    expect(screen.queryByText('Negocio', { exact: true })).toBeNull();
  });
});
