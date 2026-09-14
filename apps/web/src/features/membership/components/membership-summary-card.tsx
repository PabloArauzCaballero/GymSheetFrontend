import { IdCard } from 'lucide-react';
import type { Membership } from '@/shared/api/contracts';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';

/**
 * La membresía vigente, resumida para el panel.
 *
 * Sale del panel a su propio fichero porque ahora comparte sitio con
 * `MembershipGate`, y las dos no deben hablar a la vez: cuando el acceso no está
 * vigente manda el aviso y esta tarjeta no se monta. Tener dos textos distintos
 * sobre el mismo estado —uno diciendo «no existe una membresía visible» y otro
 * «aún no tienes membresía»— es lo que hace parecer rota una pantalla aunque
 * cada mitad esté bien por separado.
 */
export function MembershipSummaryCard({ membership }: Readonly<{ membership: Membership }>) {
  return (
    <Card>
      <CardHeader title="Membresía" />
      <CardContent>
        <div className="grid gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold">{membership.plan?.nombre ?? 'Plan activo'}</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Vence en {membership.diasRestantes} días
              </p>
            </div>
            <IdCard aria-hidden className="size-5 text-[var(--accent-ink)]" />
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-high)]">
            <div
              className="h-full rounded-full bg-[var(--volt)] transition-[width] duration-[var(--dur-6)] ease-[var(--ease-out)]"
              style={{ width: `${Math.max(4, Math.min(100, membership.diasRestantes))}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
