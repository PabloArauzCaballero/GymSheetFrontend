import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Dumbbell, MapPin } from 'lucide-react';
import { amenityIcon } from '@/features/public-facilities/components/amenity-icons';
import { BranchesMap } from '@/features/public-facilities/components/branches-map-loader';
import { PublicFooter } from '@/features/public-facilities/components/public-footer';
import { PublicHeader } from '@/features/public-facilities/components/public-header';
import { SERVICE_LABEL } from '@/features/public-facilities/components/service-labels';
import { getPublicBranch } from '@/features/public-facilities/services/public-facilities-server';
import { AmbientBackground } from '@/shared/components/background/ambient-background';
import { DomainImage } from '@/shared/components/media/domain-image';
import { signedMediaSrc } from '@/shared/server/media-signing';
import { Badge } from '@/shared/components/ui/badge';
import { ButtonLink } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>): Promise<Metadata> {
  const { id } = await params;
  const branch = await getPublicBranch(id);
  // `notFound()` se dispara aquí, no solo en el cuerpo de la página: los
  // metadatos se resuelven antes de que el árbol empiece a transmitirse, así
  // que es el único punto donde el 404 todavía puede fijar el código de
  // estado real — hacerlo solo más abajo deja un 404 "blando" (contenido
  // correcto, código 200) porque el layout raíz ya empezó a transmitir su
  // Suspense de `loading.tsx` para cuando el cuerpo de la página lo lanza.
  if (!branch) notFound();
  return {
    title: branch.nombre,
    description: branch.descripcion ?? `Servicios y equipamiento de ${branch.nombre}.`,
  };
}

export default async function GimnasioDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const branch = await getPublicBranch(id);
  if (!branch) notFound();

  const hasCoordinates = branch.latitud !== null && branch.longitud !== null;
  const mapsUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${branch.latitud},${branch.longitud}`
    : null;

  const brandLabel = branch.marca ?? branch.nombre;
  const otherSucursales = branch.sucursales.filter((sucursal) => sucursal.id !== branch.id);
  const mappable = branch.sucursales.filter(
    (sucursal): sucursal is typeof sucursal & { latitud: number; longitud: number } =>
      sucursal.latitud !== null && sucursal.longitud !== null,
  );

  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-[var(--background)]">
      <AmbientBackground behind fixed variant="portal" />
      <PublicHeader />
      <main className="mx-auto grid w-full max-w-4xl flex-1 gap-8 px-5 py-14 sm:px-8">
        <div className="reveal">
          <Link
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
            href="/gimnasios"
          >
            <ArrowLeft className="size-4" />
            Gimnasios
          </Link>
          {branch.imagenUrl ? (
            <div className="mb-6 aspect-[21/9] overflow-hidden rounded-[10px] bg-[var(--surface-low)]">
              <DomainImage alt={branch.nombre} proxy={false} src={signedMediaSrc(branch.imagenUrl)} />
            </div>
          ) : null}
          <div className="flex items-start gap-4">
            {!branch.imagenUrl ? (
              <span className="hidden size-14 shrink-0 place-items-center rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-low)] text-[var(--accent-ink)] sm:grid">
                <Dumbbell className="size-7" />
              </span>
            ) : null}
            <div>
              <p className="data-label mb-2 text-[var(--accent-ink)]">Gimnasio</p>
              <h1 className="display-title text-gradient-volt">{branch.nombre}</h1>
            </div>
          </div>
          {branch.descripcion ? (
            <p className="mt-5 max-w-2xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">
              {branch.descripcion}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/register" size="lg" variant="primary">
              Crear cuenta
            </ButtonLink>
            {mapsUrl ? (
              <ButtonLink href={mapsUrl} rel="noopener noreferrer" size="lg" target="_blank" variant="secondary">
                <MapPin className="size-4" />
                Ver en el mapa
              </ButtonLink>
            ) : null}
          </div>
        </div>

        {branch.servicios.length ? (
          <Card className="hover-lift reveal">
            <CardHeader title="Servicios" />
            <CardContent className="flex flex-wrap gap-2">
              {branch.servicios.map((servicio) => (
                <Badge key={servicio} tone="info">
                  {SERVICE_LABEL[servicio] ?? servicio}
                </Badge>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {branch.amenidades.length ? (
          <Card className="hover-lift reveal">
            <CardHeader title="Comodidades" />
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {branch.amenidades.map((amenidad) => {
                const Icon = amenityIcon(amenidad);
                return (
                  <span className="inline-flex items-center gap-2.5 text-sm text-[var(--text)]" key={amenidad}>
                    <Icon className="size-4 text-[var(--accent-ink)]" />
                    {amenidad}
                  </span>
                );
              })}
            </CardContent>
          </Card>
        ) : null}

        {branch.galeria.length ? (
          <Card className="hover-lift reveal overflow-hidden">
            <CardHeader description="Cómo se ve esta sede por dentro." title="Galería" />
            <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {branch.galeria.map((url, index) => (
                <div className="aspect-square overflow-hidden rounded-[8px]" key={url}>
                  <DomainImage alt={`${branch.nombre} — foto ${index + 1}`} proxy={false} src={signedMediaSrc(url)} />
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {mappable.length ? (
          <Card className="hover-lift reveal overflow-hidden">
            <CardHeader
              description={
                otherSucursales.length
                  ? `${branch.sucursales.length} sedes de ${brandLabel} en Santa Cruz de la Sierra.`
                  : 'Ubicación aproximada de la sede.'
              }
              title={otherSucursales.length ? `Sucursales de ${brandLabel}` : 'Cómo llegar'}
            />
            <div className="h-96 w-full">
              <BranchesMap activeId={branch.id} branches={mappable} />
            </div>
            {otherSucursales.length ? (
              <CardContent className="grid gap-1 p-3">
                {branch.sucursales.map((sucursal) => {
                  const isCurrent = sucursal.id === branch.id;
                  const content = (
                    <>
                      <div className="grid gap-0.5">
                        <p className="text-sm font-semibold text-[var(--text)]">{sucursal.nombre}</p>
                        {sucursal.descripcion ? (
                          <p className="line-clamp-1 text-xs text-[var(--text-muted)]">
                            {sucursal.descripcion}
                          </p>
                        ) : null}
                      </div>
                      {isCurrent ? (
                        <Badge tone="info">Estás aquí</Badge>
                      ) : (
                        <ArrowUpRight className="size-4 shrink-0 text-[var(--text-disabled)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      )}
                    </>
                  );
                  return isCurrent ? (
                    <div
                      className="flex items-center justify-between gap-3 rounded-[8px] p-2.5"
                      key={sucursal.id}
                    >
                      {content}
                    </div>
                  ) : (
                    <Link
                      className="group tap flex items-center justify-between gap-3 rounded-[8px] p-2.5 hover:bg-[var(--surface-low)]"
                      href={`/gimnasios/${sucursal.id}`}
                      key={sucursal.id}
                    >
                      {content}
                    </Link>
                  );
                })}
              </CardContent>
            ) : null}
          </Card>
        ) : null}

        {branch.equipamiento.length ? (
          <Card className="hover-lift reveal">
            <CardHeader description="Lo que hay disponible en esta sede." title="Equipamiento" />
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {branch.equipamiento.map((item) => (
                <p className="text-sm text-[var(--text)]" key={item.nombre}>
                  {item.nombre}
                </p>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </main>
      <PublicFooter />
    </div>
  );
}
