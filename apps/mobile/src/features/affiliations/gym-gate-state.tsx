import { gymGateCopy, type GymGateStatus } from '@gymsheet/domain';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/feedback';
import { Button } from '@/components/ui';

export { gymGateOf } from './affiliations-service';

/**
 * What a gym-scoped read (ranking, members) shows without a confirmed SOCIO:
 * `403 GYM_MEMBERSHIP_REQUIRED` is a state with its next step, never an error.
 */
export function GymGateState({ status, onNavigate }: { status: GymGateStatus; onNavigate?: () => void }) {
  const router = useRouter();
  const copy = gymGateCopy(status);
  return (
    <EmptyState compact icon="business-outline" message={copy.message} title={copy.title}>
      <Button
        label={copy.action}
        onPress={() => {
          onNavigate?.();
          router.push(status === 'REQUESTED' ? '/mi-gimnasio' : '/directorio');
        }}
        size="sm"
        variant={status === 'REQUESTED' ? 'ghost' : 'primary'}
      />
    </EmptyState>
  );
}
