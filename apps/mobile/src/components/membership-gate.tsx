import { useState } from 'react';
import { Linking, Share, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MembershipProjection } from '@gymsheet/types';
import { Button } from '@/components/ui';
import { Card } from '@/components/layout';
import { membershipService } from '@/api/services';
import { notify } from '@/notifications';
import { formatDate } from '@/lib/format';
import { colors, fontSizes, iconSizes, radii, semibold, spacing } from '@/theme';

/**
 * Qué se le dice a alguien cuya membresía no está vigente.
 *
 * El caso que esto resuelve no es el de quien no ha pagado: es el de quien
 * **sí pagó**, en efectivo y en recepción, y la aplicación no se enteró. Esa
 * persona abre la app al día siguiente, se encuentra fuera, y hasta ahora no
 * tenía a quién decírselo salvo volver al gimnasio. El botón de abajo existe
 * para ese momento exacto.
 *
 * Deliberadamente **no** bloquea la aplicación entera. Puede seguir viendo su
 * historial, sus rutinas y su progreso: eso es suyo, lo generó entrenando, y
 * retenerlo como rehén de una renovación sería castigar a quien ya pagó por un
 * fallo administrativo. Lo que la membresía gobierna es el acceso al gimnasio,
 * y eso lo comprueba la puerta, no esta pantalla.
 */
export function MembershipGate({
  projection,
  onRenew,
}: {
  projection: MembershipProjection;
  onRenew: () => void;
}) {
  const [asking, setAsking] = useState(false);
  const membership = projection.membership;
  const vencio = membership ? !membership.vigenteHoy : false;

  // El teléfono del gimnasio ya viaja en la proyección para el botón de
  // renovación; se reutiliza en vez de pedir otro dato al backend.
  const contacto = projection.renewalActions.find((action) => action.type === 'WHATSAPP');

  const pedirActivacion = async () => {
    if (!contacto) {
      notify.error('El gimnasio no tiene un WhatsApp configurado.');
      return;
    }
    setAsking(true);
    try {
      const { url: enlace } = await membershipService.requestActivation(
        'Pago fuera de la aplicación.',
      );
      const mensaje = [
        'Hola, pagué mi membresía por otro medio y quiero que activen mi cuenta.',
        '',
        'Enlace para activarla:',
        enlace,
      ].join('\n');
      // `wa.me` exige sólo dígitos: un teléfono guardado como «+591 700…»
      // abriría un chat vacío.
      const telefono = contacto.phone.replace(/\D/gu, '');
      // WhatsApp es el camino esperado, no el único.
      //
      // Se intenta primero con su propio esquema y no con `wa.me`: el enlace
      // web abre la página de WhatsApp incluso sin la aplicación instalada, y
      // esa página invita a descargarla pero no deja enviar nada, así que el
      // enlace de activación se queda en manos de quien no puede usarlo. El
      // esquema propio, en cambio, falla limpiamente cuando no está, y ese
      // fallo es la señal para ofrecer el menú del sistema —mensajes, correo,
      // Telegram, lo que la persona ya tenga—.
      //
      // Se abre y se captura en lugar de preguntar con `canOpenURL`, que para
      // un esquema propio exige declararlo en el manifiesto de cada plataforma
      // y devuelve `false` si se olvida, mandando a todo el mundo al menú de
      // compartir aunque tengan WhatsApp.
      try {
        await Linking.openURL(
          `whatsapp://send?phone=${telefono}&text=${encodeURIComponent(mensaje)}`,
        );
      } catch {
        await Share.share({ message: mensaje });
      }
    } catch (error) {
      notify.error(error as Error);
    } finally {
      setAsking(false);
    }
  };

  return (
    <Card accent={colors.warning}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radii.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceHigh,
          }}
        >
          <Ionicons color={colors.warning} name="lock-closed-outline" size={iconSizes.md} />
        </View>
        <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: '700', flex: 1 }}>
          {membership ? 'Tu membresía no está vigente' : 'Aún no tienes membresía'}
        </Text>
      </View>

      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
        {vencio && membership
          ? `Venció el ${formatDate(membership.venceEl)}. Renueva desde la app o avísanos si ya pagaste por otro medio.`
          : 'Renueva desde la app, o avísanos si ya pagaste en recepción y todavía no aparece aquí.'}
      </Text>

      <Button icon="card-outline" label="Renovar en la app" onPress={onRenew} />

      {/* La segunda vía, y la que de verdad faltaba: quien pagó en efectivo no
          debería tener que volver al gimnasio para que alguien lo note. */}
      <Button
        icon="logo-whatsapp"
        label="Ya pagué por otro medio"
        loading={asking}
        onPress={() => void pedirActivacion()}
        variant="ghost"
      />

      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
        Se enviará al gimnasio un enlace para que activen tu cuenta. Sólo puede usarlo el personal
        del gimnasio con su sesión iniciada.
      </Text>

      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, fontWeight: semibold }}>
        Mientras tanto puedes seguir viendo tus rutinas y tu historial.
      </Text>
    </Card>
  );
}
