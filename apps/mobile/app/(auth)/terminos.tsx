import { Text, View } from 'react-native';
import { BackLink } from '@/components/nav';
import { ScreenHeader, ScrollScreen, Section } from '@/components/layout';
import { colors, fontSizes, spacing } from '@/theme';

/** Mismo texto que `/terminos` en la web — se enlaza desde el registro, antes de que exista sesión. */
export default function TerminosScreen() {
  return (
    <ScrollScreen>
      <BackLink />
      <ScreenHeader subtitle="Última actualización: 25 de agosto de 2026" title="Términos y condiciones" />
      <View style={{ gap: spacing.lg }}>
        <Section title="1. Qué es GymSheet">
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 22 }}>
            GymSheet es una aplicación de registro de entrenamiento, progresión y funciones
            sociales entre socios de un mismo gimnasio. Al crear una cuenta aceptas estos términos
            y la política de privacidad.
          </Text>
        </Section>
        <Section title="2. Tu cuenta">
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 22 }}>
            Eres responsable de la confidencialidad de tu contraseña y de la información que
            registras. Puedes cerrar tu cuenta en cualquier momento desde el perfil.
          </Text>
        </Section>
        <Section title="3. Uso aceptable">
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 22 }}>
            No está permitido usar la aplicación para acosar a otros socios, suplantar
            identidades ni extraer datos de otras cuentas.
          </Text>
        </Section>
        <Section title="4. Cambios en estos términos">
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 22 }}>
            Si el texto cambia de forma relevante, se te pedirá aceptar la nueva versión la
            próxima vez que inicies sesión.
          </Text>
        </Section>
        <Section title="5. Contacto">
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 22 }}>
            Para dudas sobre estos términos, contacta al gimnasio donde tienes tu membresía.
          </Text>
        </Section>
      </View>
    </ScrollScreen>
  );
}
