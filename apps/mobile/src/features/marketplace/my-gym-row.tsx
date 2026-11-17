import { Ionicons } from '@expo/vector-icons';
import { myGymCardOf } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { MediaImage } from '@/components/media-image';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { personAffiliationsService } from '@/features/affiliations/affiliations-service';
import { colors, radii, spacing } from '@/theme';
import { initials } from './format';

/**
 * «Mi gimnasio» en una fila, no en una tarjeta de portada: lo primero, sin gritar.
 * Driven by `GET /me/gym` (ADR-0027): the confirmed SOCIO affiliation, never the
 * session's tenant. Tapping it opens «Mi gimnasio».
 */
export function MyGymRow() {
  const router = useRouter();
  const myGym = useQuery({ queryKey: queryKeys.myGym, queryFn: personAffiliationsService.myGym, staleTime: 30_000 });
  if (!myGym.data) return null;
  const card = myGymCardOf(myGym.data);
  const name = card.state === 'NONE' ? 'Hazte socio de tu gimnasio' : card.gymName;
  const status = card.state === 'CONFIRMED' ? card.detail || card.title : card.state === 'REQUESTED' ? 'Solicitud enviada' : 'Busca tu gimnasio y pide ser socio';
  return (
    <PressableScale
      accessibilityLabel={`Mi gimnasio, ${name}. ${status}`}
      accessibilityRole="button"
      onPress={() => router.push('/mi-gimnasio')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.smd,
        padding: spacing.smd,
        marginBottom: spacing.md,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceHigh,
      }}
      testID="my-gym-row"
    >
      <MediaImage
        uri={card.state === 'CONFIRMED' ? card.logoUrl : null}
        style={{ width: 44, height: 44, borderRadius: radii.md, borderCurve: 'continuous' }}
        fallback={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {card.state === 'NONE' ? (
              <Ionicons color={colors.textMuted} name="business-outline" size={20} />
            ) : (
              <Text strong tone="muted" variant="footnote">
                {initials(card.gymName)}
              </Text>
            )}
          </View>
        }
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text tone="muted" variant="caption">
          Mi gimnasio
        </Text>
        <Text numberOfLines={1} strong variant="subhead">
          {name}
        </Text>
        <Text numberOfLines={1} tone="secondary" variant="caption">
          {status}
        </Text>
      </View>
      <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
    </PressableScale>
  );
}
