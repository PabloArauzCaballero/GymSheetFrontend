'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import { InputWithIcon } from '@/shared/components/ui/input';
import { notify } from '@/shared/notifications';
import { socialService } from '@/features/social/services/social-service';
import { routineV2Keys } from '@/features/routines-v2/keys';
import { sharingService } from '@/features/routines-v2/services';

const MIN_CHARS = 2;
const MAX_PEOPLE = 20;

/**
 * «Compartir con…» (RF-13): busca a socios de tu gimnasio por nombre (sin email),
 * eliges a varios y se les envía una invitación que deben aceptar. Solo se
 * comparten rutinas privadas.
 */
export function ShareDialog({ routineId, routineName }: Readonly<{ routineId: string; routineName: string }>) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [picked, setPicked] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(term.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [term]);

  const people = useQuery({
    queryKey: routineV2Keys.directory(debounced),
    queryFn: () => socialService.directory({ q: debounced, limit: 20 }),
    enabled: open && debounced.length >= MIN_CHARS,
  });
  const send = useMutation({
    mutationFn: () => sharingService.invite(routineId, [...picked.keys()]),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: routineV2Keys.shares(routineId) });
      const skipped = result.omitidos.length;
      notify.success(
        skipped > 0
          ? `Invitación enviada a ${result.creados.length}. ${skipped} ya la tenían o no se pudo invitar.`
          : `Invitación enviada a ${result.creados.length} ${result.creados.length === 1 ? 'persona' : 'personas'}.`,
      );
      setOpen(false);
      setPicked(new Map());
      setTerm('');
    },
    onError: (error: Error) => notify.error(error),
  });

  const toggle = (id: string, name: string, on: boolean) =>
    setPicked((current) => {
      const next = new Map(current);
      if (on) next.set(id, name);
      else next.delete(id);
      return next;
    });

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Share2 aria-hidden className="size-4" />
          Compartir
        </Button>
      </DialogTrigger>
      <DialogContent
        description={`Invita a otros socios a «${routineName}». Verán la rutina cuando acepten.`}
        title="Compartir rutina"
      >
        <div className="grid gap-4">
          <Field hint={`Escribe al menos ${MIN_CHARS} letras del nombre.`} label="Buscar personas">
            <InputWithIcon
              icon={<Search className="size-4" />}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Nombre"
              type="search"
              value={term}
            />
          </Field>
          <div aria-live="polite" className="grid max-h-64 gap-1 overflow-y-auto" data-testid="share-results">
            {debounced.length < MIN_CHARS ? null : people.isLoading ? (
              <p className="p-3 text-sm text-[var(--text-muted)]">Buscando…</p>
            ) : people.isError ? (
              <p className="p-3 text-sm text-[var(--danger-text)]">No se pudo buscar. Inténtalo de nuevo.</p>
            ) : people.data?.length ? (
              people.data.map((person) => (
                <div
                  className="flex min-h-12 items-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-3"
                  key={person.userId}
                >
                  <Checkbox
                    checked={picked.has(person.userId)}
                    disabled={!picked.has(person.userId) && picked.size >= MAX_PEOPLE}
                    label={
                      // Un `div`: la casilla pinta como cuadrado a todo `span` hijo directo de su etiqueta.
                      <div className="grid">
                        <span className="font-semibold">{person.displayName}</span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {[person.objetivo, person.branchName].filter(Boolean).join(' · ') || 'Socio del gimnasio'}
                        </span>
                      </div>
                    }
                    onChange={(event) => toggle(person.userId, person.displayName, event.target.checked)}
                  />
                </div>
              ))
            ) : (
              <p className="p-3 text-sm text-[var(--text-muted)]">Nadie coincide con «{debounced}».</p>
            )}
          </div>
          {picked.size > 0 ? (
            <p className="text-sm text-[var(--text-muted)]" data-testid="share-picked">
              Elegidas: {[...picked.values()].join(', ')}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost">Cancelar</Button>
            </DialogClose>
            <Button
              disabled={picked.size === 0}
              loading={send.isPending}
              onClick={() => send.mutate()}
              variant="primary"
            >
              {picked.size > 1 ? `Enviar a ${picked.size} personas` : 'Enviar invitación'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
