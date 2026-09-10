import Link from 'next/link';
import { ArrowUpRight, Dumbbell } from 'lucide-react';
import type { PublicBranchSummary } from '@/shared/api/schemas';
import { DomainImage } from '@/shared/components/media/domain-image';
import { signedMediaSrc } from '@/shared/server/media-signing';
import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';
import { amenityIcon } from './amenity-icons';
import { SERVICE_LABEL } from './service-labels';

const CARD_AMENITY_LIMIT = 3;

export function BranchCard({ branch }: Readonly<{ branch: PublicBranchSummary }>) {
  return (
    <Link className="group block" href={`/gimnasios/${branch.id}`}>
      <Card className="hover-lift tap grid overflow-hidden p-0">
        <div className="aspect-[16/10] bg-[var(--surface-low)]">
          {branch.imagenUrl ? (
            <DomainImage
              alt={branch.nombre}
              className="size-full object-cover"
              proxy={false}
              src={signedMediaSrc(branch.imagenUrl)}
            />
          ) : (
            <div className="grid size-full place-items-center text-[var(--text-disabled)]">
              <Dumbbell className="size-8" />
            </div>
          )}
        </div>
        <div className="grid gap-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold tracking-[-0.01em]">{branch.nombre}</p>
            <ArrowUpRight className="size-4 shrink-0 text-[var(--text-disabled)] transition-colors duration-[var(--dur-2)] group-hover:text-[var(--text-muted)]" />
          </div>
          {branch.descripcion ? (
            <p className="line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">
              {branch.descripcion}
            </p>
          ) : null}
          {branch.servicios.length ? (
            <div className="flex flex-wrap gap-1.5">
              {branch.servicios.map((servicio) => (
                <Badge key={servicio} tone="info">
                  {SERVICE_LABEL[servicio] ?? servicio}
                </Badge>
              ))}
            </div>
          ) : null}
          {branch.amenidades.length ? (
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 border-t border-[var(--border-subtle)] pt-3">
              {branch.amenidades.slice(0, CARD_AMENITY_LIMIT).map((amenidad) => {
                const Icon = amenityIcon(amenidad);
                return (
                  <span
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]"
                    key={amenidad}
                  >
                    <Icon className="size-3.5 text-[var(--text-disabled)]" />
                    {amenidad}
                  </span>
                );
              })}
              {branch.amenidades.length > CARD_AMENITY_LIMIT ? (
                <span className="text-xs text-[var(--text-disabled)]">
                  +{branch.amenidades.length - CARD_AMENITY_LIMIT}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>
    </Link>
  );
}
