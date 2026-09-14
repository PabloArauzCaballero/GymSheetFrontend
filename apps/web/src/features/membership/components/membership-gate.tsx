'use client';

import { useMutation } from '@tanstack/react-query';
import { CreditCard, Lock, MessageCircle } from 'lucide-react';
import type { MembershipProjection } from '@/shared/api/contracts';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { formatDate } from '@/shared/lib/date';
import { notify } from '@/shared/notifications';
import { membershipService } from '../services/membership-service';

/**
 * Qué se le dice a alguien cuya membresía no está vigente. Espejo de
 * `src/components/membership-gate.tsx` del móvil, con los mismos textos.
 *
 * El caso que esto resuelve no es el de quien no ha pagado: es el de quien **sí
 * pagó**, en efectivo y en recepción, y la aplicación no se enteró. Esa persona
 * entra al día siguiente, se encuentra fuera, y hasta ahora en la web no tenía a
 * quién decírselo salvo volver al gimnasio. El segundo botón existe para ese
 * momento exacto.
 *
 * Deliberadamente **no** bloquea el portal. Puede seguir viendo su historial,
 * sus rutinas y su progreso: eso es suyo, lo generó entrenando, y retenerlo como
 * rehén de una renovación sería castigar a quien ya pagó por un fallo
 * administrativo. Lo que la membresía gobierna es el acceso al gimnasio, y eso
 * lo comprueba la puerta, no esta pantalla.
 */
export function MembershipGate({
  projection,
}: Readonly<{ projection: MembershipProjection }>) {
  const membership = projection.membership;
  const vencio = membership ? !membership.vigenteHoy : false;

  // El teléfono del gimnasio ya viaja en la proyección para el botón de
  // renovación; se reutiliza en vez de pedir otro dato al backend.
  const contacto = projection.renewalActions.find((action) => action.type === 'WHATSAPP');

  const pedirActivacion = useMutation({
    mutationFn: async () => {
      if (!contacto) throw new Error('El gimnasio no tiene un WhatsApp configurado.');
      // La pestaña se abre ANTES de esperar la respuesta: abrirla después ya no
      // cuenta como gesto del usuario y el navegador la bloquea. Se le quita el
      // `opener` para que la página destino no pueda tocar esta.
      const popup = window.open('about:blank', '_blank');
      if (popup) popup.opener = null;
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
        const destino = `https://wa.me/${contacto.phone.replace(/\D/gu, '')}?text=${encodeURIComponent(mensaje)}`;
        if (popup) popup.location.href = destino;
        else window.location.href = destino;
      } catch (error: unknown) {
        popup?.close();
        throw error;
      }
    },
    onSuccess: () =>
      notify.success('Mensaje preparado. El gimnasio activará tu cuenta con ese enlace.'),
    onError: (error: Error) => notify.error(error),
  });

  return (
    // Un filo de 2 px a la izquierda, como el `accent` de la tarjeta del móvil:
    // el aviso se distingue sin teñir la superficie entera, que en un panel de
    // esta altura sería un bloque de color gritando desde la primera pantalla.
    // Va en línea y no como utilidad de Tailwind porque `.panel` declara el
    // borde con la forma corta desde CSS sin capa, y eso gana a cualquier
    // utilidad: la clase se escribiría y no pintaría nada.
    <Card style={{ borderLeftWidth: '2px', borderLeftColor: 'var(--warning-border)' }}>
      <CardContent className="grid gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--surface-high)] text-[var(--warning-text)]">
            <Lock aria-hidden className="size-5" />
          </span>
          <h2 className="text-lg font-semibold tracking-[-0.02em]">
            {membership ? 'Tu membresía no está vigente' : 'Aún no tienes membresía'}
          </h2>
        </div>

        <p className="text-sm leading-6 text-[var(--text-muted)]">
          {vencio && membership
            ? `Venció el ${formatDate(membership.venceEl)}. Renueva desde la app o avísanos si ya pagaste por otro medio.`
            : 'Renueva desde la app, o avísanos si ya pagaste en recepción y todavía no aparece aquí.'}
        </p>

        <div className="flex flex-wrap gap-2">
          {/* Enlace y no botón: «Renovar» es ir a la tienda de membresías, y un
              destino real se puede abrir en otra pestaña o marcar. */}
          <ButtonLink href="/membership" variant="primary">
            <CreditCard aria-hidden className="size-4" />
            Renovar en la app
          </ButtonLink>
          {/* La segunda vía, y la que de verdad faltaba: quien pagó en efectivo
              no debería tener que volver al gimnasio para que alguien lo note. */}
          <Button
            loading={pedirActivacion.isPending}
            onClick={() => pedirActivacion.mutate()}
            type="button"
            variant="ghost"
          >
            <MessageCircle aria-hidden className="size-4" />
            Ya pagué por otro medio
          </Button>
        </div>

        <p className="text-xs leading-5 text-[var(--text-muted)]">
          Se enviará al gimnasio un enlace para que activen tu cuenta. Sólo puede usarlo el personal
          del gimnasio con su sesión iniciada.
        </p>
        <p className="text-xs font-semibold leading-5 text-[var(--text-muted)]">
          Mientras tanto puedes seguir viendo tus rutinas y tu historial.
        </p>
      </CardContent>
    </Card>
  );
}
