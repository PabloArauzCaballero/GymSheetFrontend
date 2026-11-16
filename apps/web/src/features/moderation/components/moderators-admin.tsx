'use client';

import { moderatorErrorMessage, moderatorsCopy } from '@gymsheet/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { confirm, notify } from '@/shared/notifications';
import {
  moderatorsKey,
  platformModeratorsService,
} from '@/features/moderation/services/platform-moderators-service';
import { MemberPicker } from './member-picker';

type Person = { id: string; nombreCompleto: string };

/**
 * The REPP moderation team, managed by the platform admin (ADR-0018). Each
 * change is confirmed first and the refusal is shown where it happened.
 */
export function ModeratorsAdmin() {
  const [failure, setFailure] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const team = useQuery({ queryKey: moderatorsKey, queryFn: () => platformModeratorsService.list() });

  const change = useMutation({
    mutationFn: ({ person, action }: { person: Person; action: 'add' | 'remove' }) =>
      action === 'add'
        ? platformModeratorsService.assign(person.id)
        : platformModeratorsService.revoke(person.id),
    onMutate: () => setFailure(null),
    onSuccess: async (_result, { person, action }) => {
      await queryClient.invalidateQueries({ queryKey: moderatorsKey });
      notify.success(
        action === 'add' ? moderatorsCopy.added(person.nombreCompleto) : moderatorsCopy.removed(person.nombreCompleto),
      );
    },
    onError: (error, { action }) => setFailure(moderatorErrorMessage(error, action)),
  });

  async function ask(person: Person, action: 'add' | 'remove') {
    const answer = await confirm(
      action === 'add'
        ? {
            title: moderatorsCopy.addTitle(person.nombreCompleto),
            message: moderatorsCopy.addMessage,
            confirmLabel: moderatorsCopy.addLabel,
            severity: 'info',
          }
        : {
            title: moderatorsCopy.removeTitle(person.nombreCompleto),
            message: moderatorsCopy.removeMessage,
            confirmLabel: moderatorsCopy.removeLabel,
            severity: 'danger',
          },
    );
    // `confirmed`, not the absence of an error: closing with Escape is not accepting.
    if (answer.confirmed) change.mutate({ person, action });
  }

  const busyId = change.isPending ? (change.variables?.person.id ?? null) : null;
  const members = team.data ?? [];

  return (
    <div className="grid gap-6">
      <PageHeader description={moderatorsCopy.description} title={moderatorsCopy.title} />
      {failure ? (
        <p className="text-sm text-[var(--danger-text)]" role="alert">
          {failure}
        </p>
      ) : null}
      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader
            description={members.length === 1 ? '1 persona modera.' : `${members.length} personas moderan.`}
            title="El equipo"
          />
          <CardContent>
            {team.isPending ? (
              <div aria-busy="true" className="h-32 animate-pulse rounded-[8px] bg-[var(--surface-low)]" />
            ) : team.isError ? (
              <ErrorPanel error={team.error} message={team.error.message} onRetry={() => void team.refetch()} />
            ) : members.length === 0 ? (
              <EmptyState
                description="Nadie revisa las denuncias todavía. Suma a una cuenta de socio desde la búsqueda."
                icon={<ShieldCheck className="size-6" />}
                title="El equipo está vacío"
              />
            ) : (
              <ul aria-label="Equipo de moderación" className="grid gap-2">
                {members.map((moderator) => (
                  <li
                    className="flex flex-col gap-3 rounded-[8px] border border-[var(--border-subtle)] p-3 sm:flex-row sm:items-center sm:justify-between"
                    key={moderator.id}
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold">{moderator.nombreCompleto}</p>
                      <p className="break-all text-xs text-[var(--text-muted)]">{moderator.email}</p>
                    </div>
                    <Button
                      loading={busyId === moderator.id}
                      onClick={() => void ask(moderator, 'remove')}
                      size="sm"
                      variant="ghost"
                    >
                      Quitar
                      <span className="sr-only"> a {moderator.nombreCompleto}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <MemberPicker busyId={busyId} onPick={(user) => void ask(user, 'add')} />
      </section>
    </div>
  );
}
