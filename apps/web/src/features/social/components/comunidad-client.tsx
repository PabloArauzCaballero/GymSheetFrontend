'use client';

import { PageHeader } from '@/shared/components/layout/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { ConnectionsTab } from './connections-tab';
import { DirectoryTab } from './directory-tab';
import { RequestsTab } from './requests-tab';
import { SocialStatusCard } from './social-status-card';

export function ComunidadClient() {
  return (
    <div className="grid gap-8">
      <PageHeader
        description="Conecta con otros socios de tu gimnasio, sigue tus solicitudes y controla lo que compartes."
        eyebrow="Punto 11, 10 y 5"
        title="Comunidad"
        tutorialId="page:comunidad"
      />
      <SocialStatusCard />
      <Tabs defaultValue="directorio">
        <TabsList>
          <TabsTrigger value="directorio">Directorio</TabsTrigger>
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
