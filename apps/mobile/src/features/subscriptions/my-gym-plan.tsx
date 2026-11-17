import { gymMembershipLine, myGymPlanText, renewListingId, subscriptionCopy } from '@gymsheet/domain';
import type { MyGym } from '@gymsheet/schemas';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Badge } from '@/components/layout';
import { Button } from '@/components/ui';
import { spacing } from '@/theme';
import { useMySubscriptions } from './subscriptions-service';

/** The plan of the confirmed gym on «Mi gimnasio» (plan §2.10): «Socio activo hasta …» or «Socio · plan vencido», with «Renovar». */
export function MyGymPlan({ myGym }: { myGym: MyGym }) {
  const router = useRouter();
  const subscriptions = useMySubscriptions(myGym.status === 'CONFIRMED');
  const plan = myGymPlanText(myGym, subscriptions.data);
  if (!plan || myGym.status !== 'CONFIRMED') return null;
  const line = gymMembershipLine(subscriptions.data, myGym.gym?.id);
  const renewId = line && (line.status === 'EXPIRED' || line.status === 'EXPIRING') ? renewListingId(line) : null;
  return (
    <View style={{ gap: spacing.sm }} testID="my-gym-plan">
      <View style={{ flexDirection: 'row' }}>
        <Badge label={plan.label} tone={plan.tone} />
      </View>
      {renewId ? <Button label={subscriptionCopy.renew} onPress={() => router.push({ pathname: '/publicacion/[id]', params: { id: renewId } })} size="sm" variant="ghost" /> : null}
    </View>
  );
}
