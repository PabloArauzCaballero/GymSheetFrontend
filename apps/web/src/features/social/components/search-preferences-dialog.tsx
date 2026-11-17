'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, Target, Users2 } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { publicFacilitiesClient } from '@/features/public-facilities/services/public-facilities-client';
import { directoryKeys } from '@/features/social/services/directory-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Skeleton } from '@/shared/components/feedback/skeleton';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { cn } from '@/shared/lib/cn';
import { trainingGoalLabels } from './directory-labels';

/** Session filters of the discovery deck. */
export type DeckPreferences = {
  objetivo: string;
  sucursalId: string;
};

/** The member directory also filters by gender for the current session. */
export type DirectoryPreferences = DeckPreferences & {
  genero: string;
};

/**
 * All search filters in one panel behind a button, not on the main screen.
 *
 * Goal and branch apply to both the deck and the directory. Gender is shown
 * only for the directory: in the deck, who you want to meet comes from the
 * saved discovery preferences, and a session filter contradicting them would
 * be a second source of truth.
 */
export function SearchPreferencesDialog<T extends DeckPreferences | DirectoryPreferences>({
  onChange,
  onClose,
  open,
  value,
}: Readonly<{
  onChange: (next: T) => void;
  onClose: () => void;
  open: boolean;
  value: T;
}>) {
  const genero = 'genero' in value ? value.genero : null;
  // Las sedes del gimnasio propio, no el directorio público de marcas: el
  // directorio de socios está acotado al gimnasio de quien mira, así que
  // filtrar por una sede ajena no puede devolver a nadie — y no decir por qué
  // es peor que no ofrecer la opción.
  const branches = useQuery({
    queryKey: directoryKeys.myBranches,
    queryFn: () => publicFacilitiesClient.myBranches(),
    staleTime: 5 * 60_000,
  });
  const branchList = branches.data ?? [];

  return (
    <Dialog onOpenChange={(next) => !next && onClose()} open={open}>
      <DialogContent
        className="max-w-lg"
        description={
          genero === null
            ? 'Acotan a quién ves en la baraja.'
            : 'Acotan a quién ves en el directorio de socios.'
        }
        title="Preferencias de búsqueda"
      >
        <div className="grid gap-7">
          <FilterSection icon={<Target aria-hidden className="size-4" />} title="Objetivo">
            <FilterChip
              active={!value.objetivo}
              label="Todos"
              onClick={() => onChange({ ...value, objetivo: '' })}
            />
            {Object.entries(trainingGoalLabels).map(([code, label]) => (
              <FilterChip
                active={value.objetivo === code}
                key={code}
                label={label}
                onClick={() => onChange({ ...value, objetivo: code })}
              />
            ))}
          </FilterSection>

          <FilterSection icon={<Building2 aria-hidden className="size-4" />} title="Sucursal">
            {branches.isLoading ? (
              <Skeleton className="h-11 w-full rounded-full" />
            ) : branches.isError ? (
              // Un fallo de red y «mi gimnasio tiene una única sede» no pueden
              // verse igual: en uno de los dos casos hay algo que reintentar.
              <ErrorPanel message={branches.error.message} onRetry={() => branches.refetch()} />
            ) : branchList.length > 1 ? (
              <>
                <FilterChip
                  active={!value.sucursalId}
                  label="Todas"
                  onClick={() => onChange({ ...value, sucursalId: '' })}
                />
                {branchList.map((branch) => (
                  <FilterChip
                    active={value.sucursalId === branch.id}
                    key={branch.id}
                    label={branch.nombre}
                    onClick={() => onChange({ ...value, sucursalId: branch.id })}
                  />
                ))}
              </>
            ) : (
              <EmptyState
                description="Tu gimnasio tiene una sola sede, así que no hay nada entre lo que elegir."
                title="Una única sucursal"
              />
            )}
          </FilterSection>

          {genero === null ? (
            <p className="text-sm text-[var(--text-muted)]">
              A quién quieres conocer se ajusta en tus{' '}
              <Link className="font-semibold text-[var(--text)] underline" href="/profile">
                preferencias de descubrimiento
              </Link>
              .
            </p>
          ) : (
            <FilterSection icon={<Users2 aria-hidden className="size-4" />} title="Género">
              <FilterChip active={!genero} label="Todos" onClick={() => onChange({ ...value, genero: '' })} />
              <FilterChip
                active={genero === 'MALE'}
                label="Hombre"
                onClick={() => onChange({ ...value, genero: 'MALE' })}
              />
              <FilterChip
                active={genero === 'FEMALE'}
                label="Mujer"
                onClick={() => onChange({ ...value, genero: 'FEMALE' })}
              />
            </FilterSection>
          )}

          <Button onClick={onClose} variant="primary">
            Listo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FilterSection({
  children,
  icon,
  title,
}: Readonly<{ children: ReactNode; icon: ReactNode; title: string }>) {
  return (
    <section className="grid gap-3">
      <h3 className="data-label inline-flex items-center gap-2 text-[var(--text-muted)]">
        {icon}
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

/**
 * Los chips se guardan al tocarlos, sin «Aplicar»: son preferencias
 * reversibles de un solo campo, y un botón de confirmación sería fricción sin
 * contrapartida. `aria-pressed` y no `role="tab"`: no hay paneles detrás.
 */
function FilterChip({
  active,
  label,
  onClick,
}: Readonly<{ active: boolean; label: string; onClick: () => void }>) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        'tap min-h-11 rounded-full border px-4 text-sm transition-colors duration-[var(--dur-2)]',
        active
          ? 'border-[var(--volt)] bg-[var(--surface-high)] font-semibold text-[var(--text)]'
          : 'border-[var(--border)] bg-[var(--surface-low)] text-[var(--text-muted)] hover:text-[var(--text)]',
      )}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
