'use client';

import { MessageSquareMore } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { ReportDialog } from '@/features/moderation/components/report-dialog';
import { CommentsSection } from '@/features/routine-community/components/comments-section';
import { RatingStars } from '@/features/routine-community/components/rating-stars';
import type { ExerciseLine } from '../view-model';

/**
 * Un ejercicio privado dentro de una rutina publicada se valora, se comenta y se
 * denuncia sin salir de la rutina (RF-12, D3). Nunca entra al catálogo general.
 */
export function ExerciseCommunityDialog({ line, isOwner }: Readonly<{ line: ExerciseLine; isOwner: boolean }>) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button aria-label={`Opiniones sobre ${line.nombre}`} size="sm" variant="ghost">
          <MessageSquareMore aria-hidden className="size-4" />
          <span className="hidden sm:inline">Opiniones</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        description="Es un ejercicio personal de quien hizo la rutina. Puedes valorarlo, comentarlo o avisar si no es seguro."
        title={line.nombre}
      >
        <div className="grid gap-5">
          <RatingStars id={line.ejercicioId} isOwner={isOwner} kind="EXERCISE" />
          {isOwner ? null : (
            <ReportDialog
              consequence="Alguien del equipo revisará el ejercicio. Nadie sabrá que fuiste tú."
              defaultReason="EJERCICIO_PELIGROSO"
              subjectName={line.nombre}
              successMessage="Gracias. Lo revisaremos."
              targetId={line.ejercicioId}
              targetKind="EXERCISE"
              trigger={
                <Button className="w-fit" variant="secondary">
                  Denunciar el ejercicio
                </Button>
              }
            />
          )}
          <CommentsSection id={line.ejercicioId} kind="EXERCISE" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
