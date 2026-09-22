'use client';

import { useQuery } from '@tanstack/react-query';
import { EyeOff, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/cn';
import { formatDateTime } from '@/shared/lib/date';
import {
  moderationService,
  REASON_LABEL,
  TARGET_LABEL,
  type ModerationCase,
  type ModerationTargetKind,
} from '@/features/moderation/services/moderation-service';
import { CasePanel } from './moderation-case-panel';
import { queueKey, SeverityBadge } from './moderation-labels';

function CaseRow({
  item,
  selected,
  onSelect,
}: Readonly<{ item: ModerationCase; selected: boolean; onSelect: () => void }>) {
  return (
    <button
      className={cn(
        'w-full border-b border-[var(--border-subtle)] p-4 text-left transition-colors last:border-b-0',
        selected ? 'bg-[var(--surface-low)]' : 'hover:bg-[var(--surface-low)]',
      )}
      onClick={onSelect}
      type="button"
    >
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={item.severity} />
        <span className="text-sm font-semibold text-[var(--text)]">
          {TARGET_LABEL[item.target_kind]}
        </span>
        {item.content_hidden ? (
          <Badge tone="neutral">
            <EyeOff aria-hidden className="mr-1 inline size-3" />
            Retirado
          </Badge>
        ) : null}
        {item.claimed_by_name ? (
          <Badge tone="warning">{item.claimed_by_name} lo está revisando</Badge>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-[var(--text)]">{item.reported_user_name}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        {item.reasons.map((reason) => REASON_LABEL[reason]).join(' · ')}
      </p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        {item.reporter_count === 1
          ? '1 persona lo reportó'
          : `${item.reporter_count} personas lo reportaron`}{' '}
        · {formatDateTime(item.first_reported_at)}
      </p>
    </button>
  );
}

export function ModerationQueue() {
  const [selected, setSelected] = useState<{
    targetKind: ModerationTargetKind;
    targetId: string;
  } | null>(null);

  const queue = useQuery({
    queryKey: queueKey,
    queryFn: () => moderationService.queue(),
    // La cola la trabajan varias personas a la vez: si no se refresca sola, se
    // revisa un caso que otro ya cerró.
    refetchInterval: 60_000,
  });

  const cases = queue.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        description="Contenido reportado por la comunidad, lo más urgente primero. Cada tarjeta reúne todas las quejas sobre lo mismo."
        eyebrow="Comunidad"
        title="Moderación"
      />

      {queue.isPending ? (
        <div className="h-96 animate-pulse rounded-[8px] bg-[var(--surface-low)]" />
      ) : cases.length === 0 ? (
        <EmptyState
          description="No hay nada reportado pendiente de revisar. Aquí aparecerá el contenido que la comunidad denuncie."
          icon={<ShieldCheck className="size-6" />}
          title="La cola está vacía"
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <Card>
            <CardContent className="max-h-[70vh] overflow-y-auto p-0">
              {cases.map((item) => (
                <CaseRow
                  item={item}
                  key={`${item.target_kind}:${item.target_id}`}
                  onSelect={() =>
                    setSelected({
                      targetKind: item.target_kind,
                      targetId: item.target_id,
                    })
                  }
                  selected={
                    selected?.targetId === item.target_id &&
                    selected?.targetKind === item.target_kind
                  }
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              {selected ? (
                <CasePanel
                  key={`${selected.targetKind}:${selected.targetId}`}
                  onResolved={() => setSelected(null)}
                  targetId={selected.targetId}
                  targetKind={selected.targetKind}
                />
              ) : (
                <EmptyState
                  description="Elige un caso de la lista para ver quién lo reportó, el historial de esa persona y qué sanción le correspondería."
                  title="Ningún caso seleccionado"
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
