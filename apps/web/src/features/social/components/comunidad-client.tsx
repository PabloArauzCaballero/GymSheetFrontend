'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useQuery } from '@tanstack/react-query';
import {
  Ellipsis,
  Heart,
  LifeBuoy,
  MapPin,
  MessagesSquare,
  ShieldBan,
  SlidersHorizontal,
  Store,
  Trophy,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { interactionKeys, interactionsService } from '@/features/interactions/services/interactions-service';
import { profileService } from '@/features/profile/services/profile-service';
import { socialService } from '@/features/social/services/social-service';
import { connectionKeys } from '@/features/social/services/directory-keys';
import { queryKeys } from '@/shared/api/query-keys';
import { Divider, ListCard, NavRow } from '@/shared/components/mobile/nav-row';
import { cn } from '@/shared/lib/cn';
import { DescubrirClient } from './descubrir-client';
import { SearchPreferencesDialog, type DirectoryPreferences } from './search-preferences-dialog';

const EMPTY_PREFERENCES: DirectoryPreferences = { objetivo: '', sucursalId: '', genero: '' };

type Pill = 'foryou' | 'goal';

/** Botón redondo de la cabecera (42 en el móvil, 44 aquí por el mínimo táctil). */
function RoundButton({
  label,
  active = false,
  dot = false,
  onClick,
  href,
  children,
}: Readonly<{
  label: string;
  active?: boolean;
  dot?: boolean;
  onClick?: () => void;
  href?: string;
  children: ReactNode;
}>) {
  const className = cn(
    'tap relative grid size-11 place-items-center rounded-full border bg-[var(--surface-high)] transition-colors duration-[var(--dur-2)] hover:bg-[var(--surface-highest)]',
    active ? 'border-[var(--volt)] text-[var(--accent-ink)]' : 'border-[var(--border-subtle)] text-[var(--text)]',
  );
  const badge = dot ? (
    <span aria-hidden className="absolute right-2 top-2 size-[7px] rounded-full bg-[var(--volt)]" />
  ) : null;
  if (href) {
    return (
      <Link aria-label={label} className={className} href={href}>
        {children}
        {badge}
      </Link>
    );
  }
  return (
    <button aria-label={label} className={className} onClick={onClick} type="button">
      {children}
      {badge}
    </button>
  );
}

/** Menú «⋯» de Comunidad (`community-overflow-sheet.tsx` del móvil), como hoja inferior. */
function OverflowSheet({ onPreferences }: Readonly<{ onPreferences: () => void }>) {
  const [open, setOpen] = useState(false);
  const rows: { href: string; icon: LucideIcon; title: string; subtitle: string }[] = [
    { href: '/comunidad/personas', icon: Users, title: 'Personas del gimnasio', subtitle: 'Stories, el podio y el buscador de socios' },
    { href: '/comunidad/personas#podio', icon: Trophy, title: 'Top 15 del Gym', subtitle: 'Los 15 atletas con más puntos, insignias y rachas' },
    { href: '/directorio', icon: Store, title: 'Directorio REPP', subtitle: 'Gimnasios, tiendas de nutrición y coaches verificados' },
    { href: '/comunidad/mapa', icon: MapPin, title: 'Mapa de socios', subtitle: 'Descubre quién está entrenando cerca de ti en el mapa' },
    { href: '/interacciones', icon: Heart, title: 'Tus interacciones', subtitle: 'Likes recibidos, visitas a tu perfil y solicitudes' },
    { href: '/comunidad/bloqueados', icon: ShieldBan, title: 'Personas bloqueadas', subtitle: 'Privacidad y control de usuarios bloqueados' },
    { href: '/tutorials', icon: LifeBuoy, title: 'Tour de Comunidad', subtitle: 'Aprende cómo deslizar, hacer match y conectar' },
  ];
  return (
    <DialogPrimitive.Root onOpenChange={setOpen} open={open}>
      <DialogPrimitive.Trigger
        aria-label="Opciones de Comunidad"
        className="tap grid size-11 place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-high)] hover:bg-[var(--surface-highest)]"
      >
        <Ellipsis aria-hidden className="size-5" />
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-50 bg-[var(--overlay)]" />
        <DialogPrimitive.Content className="sheet-panel fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85dvh] max-w-xl overflow-y-auto overscroll-contain rounded-t-[var(--radius-2xl)] bg-[var(--surface-high)] px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 shadow-[var(--shadow-dialog)] focus:outline-none">
          <span aria-hidden className="mx-auto mb-4 block h-1.5 w-10 rounded-full bg-[var(--border)]" />
          <div className="mb-3 flex items-center justify-between px-1">
            <DialogPrimitive.Title className="title-text">Comunidad</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Cerrar"
              className="grid size-11 place-items-center rounded-full bg-[var(--surface-highest)]"
            >
              <X aria-hidden className="size-5" />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="sr-only">Destinos y ajustes de Comunidad.</DialogPrimitive.Description>
          <ListCard className="bg-[var(--surface)]">
            <button
              className="tap flex min-h-12 w-full items-center gap-3 py-2 text-left"
              onClick={() => {
                setOpen(false);
                onPreferences();
              }}
              type="button"
            >
              <SlidersHorizontal aria-hidden className="size-5 text-[var(--text-muted)]" />
              <span className="grid flex-1 gap-0.5">
                <span className="t-headline">Preferencias de búsqueda</span>
                <span className="t-subhead text-[var(--text-muted)]">Filtra por objetivos, sedes y género</span>
              </span>
            </button>
            {rows.map((row) => (
              <div key={row.href}>
                <Divider />
                <NavRow
                  href={row.href}
                  leading={<row.icon aria-hidden className="size-5 shrink-0 text-[var(--text-muted)]" />}
                  subtitle={row.subtitle}
                  title={row.title}
                />
              </div>
            ))}
          </ListCard>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * Comunidad, la misma pestaña que `apps/mobile/app/(app)/(tabs)/comunidad.tsx`:
 * la baraja es la pantalla. Arriba, los filtros a la izquierda, «Para ti /
 * Mismo objetivo» en el centro, y mensajes y «⋯» a la derecha. El directorio
 * de personas, el podio, el mapa y lo demás viven en el «⋯», como en el móvil.
 */
export function ComunidadClient() {
  const [preferences, setPreferences] = useState<DirectoryPreferences>(EMPTY_PREFERENCES);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [pill, setPill] = useState<Pill>('foryou');

  const profile = useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => profileService.getProfile().catch(() => null),
    retry: false,
  });
  const counts = useQuery({
    queryKey: interactionKeys.counts,
    queryFn: () => interactionsService.counts().catch(() => null),
    staleTime: 60_000,
  });
  const pending = useQuery({
    queryKey: connectionKeys.byStatus('PENDING'),
    queryFn: () => socialService.listConnections('PENDING').catch(() => null),
    staleTime: 30_000,
  });
  const hasPendingReceived = (pending.data ?? []).some((connection) => connection.direction === 'RECEIVED');
  const alerts = counts.data ? counts.data.likesReceived + counts.data.profileViewsNew : 0;
  const filtersActive = Object.values(preferences).some(Boolean);
  const goal = pill === 'goal' ? (profile.data?.objetivo ?? 'HIPERTROFIA') : preferences.objetivo;

  return (
    <div className="mx-auto grid w-full max-w-xl gap-5">
      <h1 className="sr-only">Comunidad</h1>
      <div className="flex items-center justify-between gap-2">
        <RoundButton
          active={filtersActive}
          dot={filtersActive}
          label="Preferencias de búsqueda"
          onClick={() => setPreferencesOpen(true)}
        >
          <SlidersHorizontal aria-hidden className="size-5" />
        </RoundButton>

        <div
          aria-label="Qué baraja ver"
          className="flex items-center gap-0.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-low)] p-[3px]"
          role="radiogroup"
        >
          {(
            [
              ['foryou', 'Para ti'],
              ['goal', 'Mismo objetivo'],
            ] as const
          ).map(([value, label]) => (
            <button
              aria-checked={pill === value}
              className={cn(
                'min-h-9 whitespace-nowrap rounded-full px-3 text-xs transition-colors sm:px-4 duration-[var(--dur-2)]',
                pill === value
                  ? 'bg-[var(--surface-high)] font-bold text-[var(--text)]'
                  : 'font-medium text-[var(--text-muted)] hover:text-[var(--text)]',
              )}
              key={value}
              onClick={() => setPill(value)}
              role="radio"
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <RoundButton
            dot={hasPendingReceived || alerts > 0}
            href="/chat"
            label={hasPendingReceived ? 'Mensajes y solicitudes, con solicitudes pendientes' : 'Mensajes y solicitudes'}
          >
            <MessagesSquare aria-hidden className="size-5" />
          </RoundButton>
          <OverflowSheet onPreferences={() => setPreferencesOpen(true)} />
        </div>
      </div>

      <DescubrirClient
        embedded
        genero={preferences.genero}
        key={`${pill}-${goal}`}
        objetivo={goal}
        sucursalId={preferences.sucursalId}
      />

      <SearchPreferencesDialog
        onChange={(next) => {
          setPreferences(next);
          setPill('foryou');
        }}
        onClose={() => setPreferencesOpen(false)}
        open={preferencesOpen}
        value={preferences}
      />
    </div>
  );
}
