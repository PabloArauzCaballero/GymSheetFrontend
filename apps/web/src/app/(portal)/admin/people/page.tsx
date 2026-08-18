import type { Metadata } from 'next';
import { PersonEnrollment } from '@/features/admin/components/person-enrollment';

export const metadata: Metadata = {
  title: 'Registrar persona',
  description:
    'Alta de personas con credencial facial capturada desde la cámara del computador.',
};

export default function AdminPeoplePage() {
  return <PersonEnrollment />;
}
