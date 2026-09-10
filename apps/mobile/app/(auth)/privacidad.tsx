import { Text, View } from 'react-native';
import { BackLink } from '@/components/nav';
import { ScreenHeader, ScrollScreen, Section } from '@/components/layout';
import { colors, fontSizes, spacing } from '@/theme';

/** Mismo texto que `/privacidad` en la web — se enlaza desde el registro, antes de que exista sesión. */
export default function PrivacidadScreen() {
  return (
    <ScrollScreen>
      <BackLink />
      <ScreenHeader subtitle="Última actualización: 25 de agosto de 2026" title="Política de privacidad" />
      <View style={{ gap: spacing.lg }}>
        <Section title="1. Qué datos guardamos">
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 22 }}>
            Datos de cuenta, entrenamientos y series registradas, medidas antropométricas, y —solo
            si las activas— género, ubicación al verificar una racha, fotos de perfil y datos de
            las funciones sociales.
          </Text>
        </Section>
        <Section title="2. Para qué los usamos">
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 22 }}>
            Para mostrarte tu progreso, calcular rachas e insignias, y generar la clasificación de
            tu gimnasio. No vendemos tus datos a terceros.
          </Text>
        </Section>
        <Section title="3. Quién los ve">
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 22 }}>
            La clasificación del gimnasio solo muestra tu nombre e inicial. El personal del
            gimnasio ve los datos necesarios para tu membresía; no ve tus conversaciones ni tu
            ubicación exacta.
          </Text>
        </Section>
        <Section title="4. Tus derechos">
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 22 }}>
            Puedes pedir la eliminación de tu cuenta y de tus datos en cualquier momento
            contactando al gimnasio donde tienes tu membresía.
          </Text>
        </Section>
      </View>
    </ScrollScreen>
  );
}
