'use client';

import { BellOff, BellRing, Lock, MonitorSmartphone, ShieldOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useWebPush } from '@/features/notifications/hooks/use-web-push';
import type { WebPushState } from '@/features/notifications/hooks/web-push-state';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';

type Panel = {
  icon: LucideIcon;
  headline: string;
  detail: string;
};

/**
 * Un estado, una explicación. No hay estado mudo a propósito: «no pasa nada al
 * pulsar» es el fallo más caro de esta pantalla, y la diferencia entre «tu
 * navegador no puede», «el gimnasio no lo tiene puesto» y «lo bloqueaste tú»
 * decide si el usuario puede hacer algo al respecto.
 */
const panels: Record<Exclude<WebPushState, 'checking'>, Panel> = {
  unsupported: {
    icon: MonitorSmartphone,
    headline: 'Este navegador no admite avisos',
    detail:
      'Los avisos del sistema necesitan un navegador con service workers sobre una conexión segura. Prueba desde Chrome, Edge, Firefox o Safari actualizados, o usa la aplicación móvil.',
  },
  unavailable: {
    icon: ShieldOff,
    headline: 'Todavía no disponible',
    detail:
      'Este gimnasio aún no tiene configurados los avisos del navegador. Tu bandeja de aquí arriba sigue recibiéndolo todo.',
  },
  denied: {
    icon: Lock,
    headline: 'Avisos bloqueados',
    detail:
      'Bloqueaste las notificaciones para este sitio, y solo tú puedes revertirlo: abre el candado junto a la dirección, pon Notificaciones en «Permitir» y vuelve a cargar.',
  },
  idle: {
    icon: BellRing,
    headline: 'Recibe los avisos aquí',
    detail:
      'Te avisamos en el escritorio aunque la pestaña esté cerrada. Pedimos permiso al navegador solo cuando pulses el botón, y puedes retirarlo cuando quieras.',
  },
  subscribed: {
    icon: BellRing,
    headline: 'Avisos activados',
    detail:
      'Este navegador recibirá los avisos de tu cuenta. Si usas otro equipo, actívalos también allí: el permiso es de cada navegador.',
  },
};

export function WebPushCard() {
  const { state, pending, subscribe, unsubscribe } = useWebPush();
  return (
    <Card>
      <CardHeader
        action={state === 'subscribed' ? <Badge tone="success">Activado</Badge> : undefined}
        description="Avisos del sistema fuera de la pestaña, con permiso explícito."
        title="Este navegador"
      />
      <CardContent>
        {state === 'checking' ? (
          <p aria-live="polite" className="text-sm leading-6 text-[var(--text-muted)]">
            Comprobando el estado de los avisos…
          </p>
        ) : (
          <PanelBody panel={panels[state]}>
            {state === 'idle' ? (
              <Button loading={pending} onClick={() => void subscribe()} variant="primary">
                <BellRing aria-hidden className="size-4" />
                Activar avisos
              </Button>
            ) : null}
            {state === 'subscribed' ? (
              <Button loading={pending} onClick={() => void unsubscribe()} variant="secondary">
                <BellOff aria-hidden className="size-4" />
                Desactivar
              </Button>
            ) : null}
            {state === 'denied' ? (
              <Button onClick={() => window.location.reload()} variant="secondary">
                Ya lo permití, recargar
              </Button>
            ) : null}
          </PanelBody>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * `animate-fade-in` y no un desplazamiento: la tarjeta cambia de estado dentro
 * de una columna ya asentada, y moverla arrastraría lo que tiene debajo. El
 * `key` fuerza el remontado para que la transición ocurra al cambiar de estado y
 * no solo al entrar. El kill-switch global de `prefers-reduced-motion`
 * (`animations.css`) neutraliza la animación sin tocar nada aquí.
 */
function PanelBody({ panel, children }: Readonly<{ panel: Panel; children: ReactNode }>) {
  const Icon = panel.icon;
  return (
    <div className="animate-fade-in grid gap-5" key={panel.headline}>
      <div className="flex gap-4">
        <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-low)]">
          <Icon aria-hidden className="size-4 text-[var(--accent-ink)]" />
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold tracking-[-0.01em]">{panel.headline}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{panel.detail}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
