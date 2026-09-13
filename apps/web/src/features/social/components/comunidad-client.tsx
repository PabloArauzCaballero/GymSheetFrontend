'use client';

import { useQuery } from '@tanstack/react-query';
import { Flame, Heart, MessagesSquare, Search, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import {
  interactionKeys,
  interactionsService,
} from '@/features/interactions/services/interactions-service';
import { socialService } from '@/features/social/services/social-service';
import { connectionKeys } from '@/features/social/services/directory-keys';
import { StoriesStrip } from '@/features/stories';
import { ButtonLink } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { DirectoryBrowser } from './directory-browser';
import { PodiumPreview } from './podium-preview';
import { SearchPreferencesDialog, type DirectoryPreferences } from './search-preferences-dialog';

const EMPTY_PREFERENCES: DirectoryPreferences = { objetivo: '', sucursalId: '', genero: '' };

/**
 * Comunidad.
 *
 * Antes de esto la página aterrizaba en un panel de tres pestañas —Descubrir,
 * Solicitudes, Mis conexiones— antes de enseñar a una sola persona, y su
 * pestaña «Descubrir» era la baraja: el directorio del gimnasio no se podía
 * recorrer desde el navegador. Es la forma que el móvil ya había dejado atrás.
 *
 * Ahora la gente aparece de entrada: stories, el podio, un buscador y el
 * directorio. Lo que no es «quién hay» vive detrás de los iconos de la esquina
 * —preferencias, interacciones y mensajes—, que son las dos bandejas de entrada
 * de la parte social más el ajuste de a quién ves. La baraja es un destino
 * propio (`/descubrir`), no un modo de esta pantalla: se decide arrastrando y
 * ocupa el ancho entero.
 *
 * Los filtros son estado de la página y viajan a Descubrir como parámetros de
 * la URL: llegar a la baraja no debería reabrir un gimnasio recién acotado.
 */
export function ComunidadClient({
  sessionName,
  sessionUserId,
}: Readonly<{ sessionName: string; sessionUserId: string }>) {
  const [preferences, setPreferences] = useState<DirectoryPreferences>(EMPTY_PREFERENCES);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [search, setSearch] = useState('');
  /**
   * El campo conserva `search` para que el teclado responda a cada tecla; lo
   * que viaja a la API es este valor retrasado, porque si no cada pulsación
   * cambiaría la `queryKey` y saldría una petición por letra.
   */
  const debouncedSearch = useDebouncedValue(search.trim(), 250);

  const activeFilters = useMemo(
    () => Object.values(preferences).filter(Boolean).length,
    [preferences],
  );

  const discoverHref = useMemo(() => {
    const params = new URLSearchParams();
    if (preferences.objetivo) params.set('objetivo', preferences.objetivo);
    if (preferences.sucursalId) params.set('sucursalId', preferences.sucursalId);
    if (preferences.genero) params.set('genero', preferences.genero);
    const query = params.toString();
    return query ? `/descubrir?${query}` : '/descubrir';
  }, [preferences]);

  return (
    <div className="grid gap-8">
      <CommunityHeader
        onOpenPreferences={() => setPreferencesOpen(true)}
        preferencesCount={activeFilters}
      />

      <StoriesStrip ownName={sessionName} ownUserId={sessionUserId} />

      <PodiumPreview />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <Input
            aria-label="Buscar un socio por su nombre"
            autoComplete="off"
            className="pl-9"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre de un socio…"
            type="search"
            value={search}
          />
        </div>
        {/* Tercera forma de mirar el mismo catálogo, pero no un modo de esta
            pantalla: la baraja se decide arrastrando y ocupa el ancho entero,
            así que es un destino. Se lleva los filtros puestos. */}
        <ButtonLink href={discoverHref} variant="secondary">
          <Flame aria-hidden className="size-4 text-[var(--accent-ink)]" />
          Descubrir
        </ButtonLink>
      </div>

      <DirectoryBrowser preferences={preferences} query={debouncedSearch} />

      <SearchPreferencesDialog
        onChange={setPreferences}
        onClose={() => setPreferencesOpen(false)}
        open={preferencesOpen}
        value={preferences}
      />
    </div>
  );
}

/**
 * La cabecera: el título y, en la esquina, los tres accesos.
 *
 * No son un menú. Interacciones y Mensajes son las dos bandejas de entrada de
 * la parte social —lo que han hecho contigo y lo que te han escrito— y van
 * donde ya se mira, no detrás de una lista que habría que abrir para descubrir
 * que hay algo nuevo. Las dos llevan aviso, con una diferencia deliberada:
 * en interacciones un número, porque «alguien te dio like» y «siete personas te
 * dieron like» piden entrar con urgencias distintas; en mensajes un punto,
 * porque ahí sólo importa que hay algo nuevo.
 */
function CommunityHeader({
  onOpenPreferences,
  preferencesCount,
}: Readonly<{ onOpenPreferences: () => void; preferencesCount: number }>) {
  // El fallo se traga: son indicadores, no contenido. Si la consulta revienta
  // lo correcto es que el aviso no aparezca, no que la página salude con un
  // error sobre algo que el usuario no vino a buscar.
  const counts = useQuery({
    queryKey: interactionKeys.counts,
    queryFn: () => interactionsService.counts().catch(() => null),
    staleTime: 60_000,
  });
  const alerts = counts.data ? counts.data.likesReceived + counts.data.profileViewsNew : 0;

  const pending = useQuery({
    queryKey: connectionKeys.byStatus('PENDING'),
    queryFn: () => socialService.listConnections('PENDING').catch(() => null),
    staleTime: 30_000,
  });
  const hasPendingReceived = (pending.data ?? []).some(
    (connection) => connection.direction === 'RECEIVED',
  );

  return (
    <header className="reveal grid gap-5 border-b border-[var(--border-subtle)] pb-8">
      <div className="flex justify-end gap-2">
        <HeaderAction
          badge={
            preferencesCount > 0 ? (
              <CountBadge label={`${preferencesCount} filtros activos`} value={preferencesCount} />
            ) : null
          }
          label={
            preferencesCount > 0
              ? `Preferencias de búsqueda, ${preferencesCount} activas`
              : 'Preferencias de búsqueda'
          }
          onClick={onOpenPreferences}
        >
          <SlidersHorizontal aria-hidden className="size-5" />
        </HeaderAction>
        <HeaderAction
          badge={alerts > 0 ? <CountBadge label={`${alerts} novedades`} value={alerts} /> : null}
          href="/interacciones"
          label={
            alerts > 0
              ? `Interacciones, ${alerts} ${alerts === 1 ? 'novedad' : 'novedades'}`
              : 'Interacciones'
          }
        >
          <Heart aria-hidden className="size-5" />
        </HeaderAction>
        <HeaderAction
          badge={
            hasPendingReceived ? (
              <span
                aria-hidden
                className="absolute right-1.5 top-1.5 size-2.5 rounded-full border-2 border-[var(--background)] bg-[var(--volt)]"
              />
            ) : null
          }
          href="/chat"
          label={
            hasPendingReceived
              ? 'Mensajes y solicitudes, con solicitudes pendientes'
              : 'Mensajes y solicitudes'
          }
        >
          <MessagesSquare aria-hidden className="size-5" />
        </HeaderAction>
      </div>

      <div className="max-w-2xl">
        <h1 className="display-title" data-tutorial-id="page:comunidad">
          Comunidad
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--text-muted)] sm:text-base">
          Socios de tu gimnasio, filtrados por lo que buscas. Comparte tu día y decide con quién
          entrenas.
        </p>
      </div>
    </header>
  );
}

function HeaderAction({
  badge,
  children,
  href,
  label,
  onClick,
}: Readonly<{
  badge: ReactNode;
  children: ReactNode;
  href?: string;
  label: string;
  onClick?: () => void;
}>) {
  const className =
    'tap hover-lift relative grid size-11 place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-low)] text-[var(--text)] transition-colors duration-[var(--dur-2)] hover:border-[var(--border)]';
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

function CountBadge({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <span
      aria-hidden
      className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full border-2 border-[var(--background)] bg-[var(--volt)] px-1 text-[10px] font-bold tabular-nums text-[var(--accent-contrast)]"
      title={label}
    >
      {value > 99 ? '99+' : value}
    </span>
  );
}
