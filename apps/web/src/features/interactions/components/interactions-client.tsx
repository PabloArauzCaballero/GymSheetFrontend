'use client';

import { useQuery } from '@tanstack/react-query';
import {
  interactionKeys,
  interactionsService,
} from '@/features/interactions/services/interactions-service';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { LikesPanel } from './likes-panel';
import { PassesPanel } from './passes-panel';
import { ProfileViewsPanel } from './profile-views-panel';

/**
 * Interacciones: las tres superficies que responden «¿qué pasó con mi perfil?».
 *
 * Van juntas y no repartidas por Comunidad porque son la misma pregunta hecha
 * de tres maneras, y porque separarlas obligaría a buscar en tres sitios el
 * mismo tipo de novedad. Los contadores de las pestañas salen de
 * `/me/interactions/counts`, la misma fuente que enciende el punto de la
 * navegación: dos números distintos para lo mismo es cómo se pierde la
 * confianza en ambos.
 */
export function InteractionsClient() {
  const counts = useQuery({
    queryKey: interactionKeys.counts,
    queryFn: () => interactionsService.counts(),
  });
  const data = counts.data ?? null;

  return (
    <div className="grid gap-8">
      <PageHeader
        description="Quién te dio like, quién vio tu perfil y quién te dio next. Todo lo que pasó mientras no mirabas."
        eyebrow="Comunidad"
        title="Interacciones"
        tutorialId="page:interacciones"
      />
      <Tabs defaultValue="likes">
        <TabsList>
          <TabsTrigger value="likes">
            Likes
            <TabCount value={data ? data.likesReceived : null} />
          </TabsTrigger>
          <TabsTrigger value="vistas">
            Vieron tu perfil
            <TabCount value={data ? data.profileViewsNew : null} />
          </TabsTrigger>
          <TabsTrigger value="next">
            Next
            <TabCount value={data ? data.passesReceived : null} />
          </TabsTrigger>
        </TabsList>
        <TabsContent value="likes">
          <LikesPanel counts={data} />
        </TabsContent>
        <TabsContent value="vistas">
          <ProfileViewsPanel />
        </TabsContent>
        <TabsContent value="next">
          <PassesPanel counts={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** El número sólo aparece cuando hay algo que contar; un «0» es ruido. */
function TabCount({ value }: Readonly<{ value: number | null }>) {
  if (!value) return null;
  return (
    <span className="ml-2 rounded-full bg-[var(--surface-high)] px-2 py-0.5 text-xs font-semibold tabular-nums text-[var(--text)]">
      {value}
    </span>
  );
}
