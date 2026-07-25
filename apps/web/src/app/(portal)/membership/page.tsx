import type { Metadata } from 'next';
import { MembershipPageClient } from '@/features/membership/components/membership-page-client';
export const metadata: Metadata = { title: 'Membresía' };
export default function MembershipPage() {
  return <MembershipPageClient />;
}
