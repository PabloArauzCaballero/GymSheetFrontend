'use client';

import { Sparkles } from 'lucide-react';
import { StoriesStrip } from '@/features/stories';
import { PageHeader } from '@/shared/components/layout/page-header';
import { ButtonLink } from '@/shared/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { ConnectionsTab } from './connections-tab';
import { DirectoryTab } from './directory-tab';
import { RequestsTab } from './requests-tab';
import { SocialStatusCard } from './social-status-card';

/**
 * Comunidad.
 *
 * El orden de la página es el de la atención: primero las stories —lo efímero,
 * lo que caduca en 24 h—, después el descubrimiento, y por debajo lo que no se
 * mueve (solicitudes, conexiones, estado social). Lo que pasó mientras no
 * mirabas vive en «Interacciones», a un clic desde la cabecera.
 */
export function ComunidadClient({
  sessionName,
  sessionUserId,
}: Readonly<{ sessionName: string; sessionUserId: string }>) {
  return (
    <div className="grid gap-8">
      <PageHeader
        actions={
          <ButtonLink href="/interacciones" variant="secondary">
            <Sparkles aria-hidden className="size-4" />
            Interacciones
          </ButtonLink>
        }
        description="Descubre socios de tu gimnasio, comparte tu día y controla lo que muestras."
        eyebrow="Punto 11, 10 y 5"
        title="Comunidad"
        tutorialId="page:comunidad"
      />
      <StoriesStrip ownName={sessionName} ownUserId={sessionUserId} />
      <SocialStatusCard />
      <Tabs defaultValue="directorio">
        <TabsList>
          <TabsTrigger value="directorio">Descubrir</TabsTrigger>
          <TabsTrigger value="solicitudes">Solicitudes</TabsTrigger>
          <TabsTrigger value="conexiones">Mis conexiones</TabsTrigger>
        </TabsList>
        <TabsContent value="directorio">
          <DirectoryTab />
        </TabsContent>
        <TabsContent value="solicitudes">
          <RequestsTab />
        </TabsContent>
        <TabsContent value="conexiones">
          <ConnectionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
