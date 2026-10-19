'use client';

import { Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/layout/page-header';
import { ButtonLink } from '@/shared/components/ui/button';
import { ExerciseBrowser } from './exercise-browser';

/** La biblioteca de ejercicios: cabecera y el buscador en modo `browse`. */
export function ExerciseList() {
  return (
    <div className="grid gap-8">
      <PageHeader
        actions={
          <span data-tutorial-id="exercises:new">
            <ButtonLink href="/exercises/new" variant="primary">
              <Plus className="size-4" />
              Ejercicio personal
            </ButtonLink>
          </span>
        }
        description="Catálogo global y ejercicios personales visibles para tu cuenta."
        eyebrow="Biblioteca técnica"
        title="Ejercicios"
        tutorialId="page:exercises"
      />
      <ExerciseBrowser mode="browse" />
    </div>
  );
}
