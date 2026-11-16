import { useRouter } from 'expo-router';
import { Button } from '@/components/ui';
import { noticeRoute } from './notice-route';

/** The way out of a notice that opens somewhere (the export notices open Privacidad y datos). */
export function NoticeLink({ notice }: Readonly<{ notice: { tipo?: string | null } }>) {
  const router = useRouter();
  const route = noticeRoute(notice);
  if (!route) return null;
  return (
    <Button
      icon="arrow-forward"
      iconPosition="end"
      label={route.label}
      onPress={() => router.push(route.href)}
      size="sm"
      style={{ alignSelf: 'flex-start' }}
      variant="secondary"
    />
  );
}
