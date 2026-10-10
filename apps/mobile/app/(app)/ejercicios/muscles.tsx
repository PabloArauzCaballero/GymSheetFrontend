import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Card, Divider, ScrollScreen, ScreenHeader, Section } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { BackLink } from '@/components/nav';
import { type MuscleInfo, musclesByGroup } from '@/features/body-map';
import { colors, fontSizes, iconSizes, minTouchTarget, semibold, spacing } from '@/theme';
import { routes } from '@/lib/routes';

function MuscleRow({ muscle, onPress }: { muscle: MuscleInfo; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityLabel={`${muscle.name}, ${muscle.latinName}`}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: minTouchTarget,
        paddingVertical: spacing.sm,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>{muscle.name}</Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{muscle.latinName}</Text>
      </View>
      <Ionicons
        accessibilityElementsHidden
        color={colors.textDisabled}
        importantForAccessibility="no-hide-descendants"
        name="chevron-forward"
        size={iconSizes.md}
      />
    </PressableScale>
  );
}

/**
 * Todos los músculos en una lista, de arriba abajo del cuerpo.
 *
 * Es la alternativa a la figura para quien no puede o no quiere apuntar con el
 * dedo (lector de pantalla, motricidad fina) y para encontrar uno por su
 * nombre, y lleva exactamente a las mismas pantallas.
 */
export default function MusclesListScreen() {
  const router = useRouter();
  return (
    <ScrollScreen>
      <BackLink />
      <ScreenHeader subtitle="Elige uno para ver sus ejercicios" title="Músculos" />
      {musclesByGroup().map(({ group, muscles }, index) => (
        <Section index={index} key={group.code} title={group.name}>
          <Card list>
            {muscles.map((muscle, rowIndex) => (
              <View key={muscle.code}>
                {rowIndex > 0 ? <Divider /> : null}
                <MuscleRow
                  muscle={muscle}
                  onPress={() => router.push(routes.muscle(muscle.code))}
                />
              </View>
            ))}
          </Card>
        </Section>
      ))}
    </ScrollScreen>
  );
}
