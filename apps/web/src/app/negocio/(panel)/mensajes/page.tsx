import type { Metadata } from 'next';
import { BusinessInbox } from '@/features/business-chat/components/business-inbox';

export const metadata: Metadata = { title: 'Mensajes' };

/** «Mensajes» of the business portal (franja 8f). The layout already requires a business session. */
export default function BusinessMessagesPage() {
  return <BusinessInbox />;
}
