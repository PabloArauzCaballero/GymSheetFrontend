import type { ReactNode } from 'react';
import { Check, ExternalLink } from 'lucide-react';
import type { MembershipPlan } from '@/shared/api/contracts';
import { DomainImage } from '@/shared/components/media/domain-image';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';

export function Fact({
  icon,
  label,
  value,
}: Readonly<{ icon: ReactNode; label: string; value: string }>) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-[var(--surface-low)] p-3">
      <span className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        {icon}
        {label}
      </span>
      <strong className="mt-2 block">{value}</strong>
    </div>
  );
}

export function PlanCard({
  plan,
  active,
  busy,
  onSelect,
}: Readonly<{ plan: MembershipPlan; active: boolean; busy: boolean; onSelect: () => void }>) {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-[16/9] bg-[var(--surface-low)]">
        {plan.imagen ? (
          <DomainImage
            alt={plan.imagen.altText}
            className="size-full object-cover"
            src={plan.imagen.url}
          />
        ) : (
          <div className="grid size-full place-items-center text-[var(--text-muted)]">
            Imagen no disponible
          </div>
        )}
      </div>
      <CardHeader description={plan.descripcion ?? undefined} title={plan.nombre} />
      <CardContent className="grid gap-4">
        <p className="text-2xl font-semibold tabular-nums">
          {plan.precio?.toLocaleString('es-BO') ?? '—'}{' '}
          <span className="text-sm font-normal text-[var(--text-muted)]">{plan.moneda}</span>
        </p>
        <p className="text-sm text-[var(--text-muted)]">{plan.duracionDias} días</p>
        <ul className="grid gap-2 text-sm">
          {plan.beneficios.map((benefit) => (
            <li className="flex gap-2" key={benefit}>
              <Check className="mt-0.5 size-4 shrink-0 text-[var(--text-muted)]" />
              {benefit}
            </li>
          ))}
        </ul>
        <Button disabled={busy} onClick={onSelect} variant="primary">
          {active ? 'Añadir meses' : 'Renovar por WhatsApp'}
          <ExternalLink className="size-4" />
        </Button>
        <p className="text-xs text-[var(--text-muted)]">
          Continuarás en WhatsApp. Esto registra una intención; no activa el acceso automáticamente.
        </p>
      </CardContent>
    </Card>
  );
}
