'use client';

import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Section } from '@/shared/components/mobile/section';
import { ChoiceChip } from '@/shared/components/ui/choice-chip';
import { Button } from '@/shared/components/ui/button';
import { reelsService } from '../services/reels-service';
import { ReelCard } from './reel-card';
import { ReelUploadSection } from './reel-upload-section';
import { feedKey } from './reels-shared';

export function ReelsPageClient({ viewerId }: Readonly<{ viewerId?: string }>) {
  const activeVideo = useRef<HTMLVideoElement | null>(null);
  const [feedTab, setFeedTab] = useState<'MINE' | 'FOR_YOU' | 'CONNECTIONS'>('MINE');
  const [commentsReel, setCommentsReel] = useState<string | null>(null);

  const feed = useQuery({
    queryKey: [...feedKey, feedTab],
    queryFn: () => reelsService.feed(feedTab),
  });

  return (
    // «Reels» del móvil: cabecera, «Publicar» y los feeds como chips.
    <main className="mx-auto grid w-full max-w-[560px] gap-8 lg:max-w-[760px]">
      <PageHeader description="Publica videos y mira reels de tus conexiones." title="Reels" />

      <Section title="Publicar">
        <ReelUploadSection onRetryFeed={() => void feed.refetch()} />
      </Section>

      <section aria-labelledby="my-reels-title" className="grid gap-4">
        <div className="flex flex-wrap gap-2" aria-label="Feeds de reels">
          {(
            [
              ['FOR_YOU', 'Para ti'],
              ['CONNECTIONS', 'Conexiones'],
              ['MINE', 'Mis reels'],
            ] as const
          ).map(([tab, label]) => (
            <ChoiceChip
              key={tab}
              onClick={() => {
                setFeedTab(tab);
                setCommentsReel(null);
              }}
              selected={feedTab === tab}
            >
              {label}
            </ChoiceChip>
          ))}
        </div>
        <h2 className="text-lg font-semibold" id="my-reels-title">
          {feedTab === 'MINE'
            ? 'Mis reels publicados'
            : feedTab === 'FOR_YOU'
              ? 'Para ti'
              : 'Conexiones'}
        </h2>
        {feed.isLoading ? <p role="status">Cargando reels…</p> : null}
        {feed.isError ? (
          <div className="grid justify-items-start gap-2" role="alert">
            <p>No se pudieron cargar tus reels.</p>
            <Button onClick={() => void feed.refetch()} type="button">
              Reintentar
            </Button>
          </div>
        ) : null}
        {feed.isSuccess && feed.data.items.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            {feedTab === 'MINE'
              ? 'Tus reels publicados aparecerán aquí.'
              : 'Todavía no hay reels disponibles en este feed.'}
          </p>
        ) : null}
        {feed.isSuccess && feed.data.items.length > 0 ? (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {feed.data.items.map((reel) => (
              <ReelCard
                commentsOpen={commentsReel === reel.id}
                key={reel.id}
                onToggleComments={() =>
                  setCommentsReel((current) => (current === reel.id ? null : reel.id))
                }
                onVideoPause={(video) => {
                  if (activeVideo.current === video) activeVideo.current = null;
                }}
                onVideoPlay={(video) => {
                  if (activeVideo.current && activeVideo.current !== video) activeVideo.current.pause();
                  activeVideo.current = video;
                }}
                reel={reel}
                showInteractions={feedTab !== 'MINE'}
                viewerId={viewerId}
              />
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
