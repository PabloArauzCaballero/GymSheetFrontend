'use client';

import { Building2, Flag, GraduationCap, Heart, Trophy, User } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import type { GymDirectoryEntry } from '@/shared/api/schemas';
import { DomainImage } from '@/shared/components/media/domain-image';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import {
  experienceLevelLabels,
  genderLabels,
  levelTitle,
  trainingGoalLabels,
} from './directory-labels';
import { socialStatusLabels } from './social-status-labels';
import { galleryOf } from './directory-card-face';

type DetailRow = { icon: ReactNode; label: string; value: string };
type DetailSection = { key: string; title: string; rows: DetailRow[] };

/**
 * Las secciones que la persona ha rellenado. Nada más.
 *
 * Una sección vacía con un guion dentro no informa de nada y deja la ficha
 * llena de huecos esperando datos que este backend no tiene: aquí no hay
 * biografía, ni ubicación, ni distancia, ni intereses, así que tampoco hay
 * sitios reservados para ellos.
 */
export function detailSectionsOf(entry: GymDirectoryEntry): DetailSection[] {
  const training: DetailRow[] = [];
  if (entry.objetivo) {
    training.push({
      icon: <Flag aria-hidden className="size-4" />,
      label: 'Objetivo',
      value: trainingGoalLabels[entry.objetivo] ?? entry.objetivo,
    });
  }
  if (entry.experienceLevel) {
    training.push({
      icon: <GraduationCap aria-hidden className="size-4" />,
      label: 'Experiencia',
      value: experienceLevelLabels[entry.experienceLevel] ?? entry.experienceLevel,
    });
  }
  if (entry.branchName) {
    training.push({
      icon: <Building2 aria-hidden className="size-4" />,
      label: 'Sucursal',
      value: entry.branchName,
    });
  }

  const progression: DetailRow[] = [];
  if (entry.levelCode) {
    progression.push({
      icon: <Trophy aria-hidden className="size-4" />,
      label: 'Rango',
      value: levelTitle(entry.levelCode),
    });
  }
  if (typeof entry.points === 'number') {
    progression.push({
      icon: <Trophy aria-hidden className="size-4" />,
      label: 'Puntos',
      value: `${entry.points.toLocaleString('es-ES')} pts`,
    });
  }

  const about: DetailRow[] = [];
  if (entry.gender) {
    about.push({
      icon: <User aria-hidden className="size-4" />,
      label: 'Género',
      value: genderLabels[entry.gender] ?? entry.gender,
    });
  }
  if (entry.socialStatus) {
    about.push({
      icon: <Heart aria-hidden className="size-4" />,
      label: 'Estado',
      value: socialStatusLabels[entry.socialStatus],
    });
  }

  return [
    { key: 'training', title: 'Entrenamiento', rows: training },
    { key: 'progression', title: 'Progresión', rows: progression },
    { key: 'about', title: 'Sobre', rows: about },
  ].filter((section) => section.rows.length > 0);
}

export function DetailSectionBlock({ section }: Readonly<{ section: DetailSection }>) {
  return (
    <section className="grid gap-3">
      <h3 className="data-label text-[var(--text-muted)]">{section.title}</h3>
      <dl className="grid divide-y divide-[var(--border-subtle)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-low)] px-4">
        {section.rows.map((row) => (
          <div className="flex items-center justify-between gap-4 py-3" key={row.label}>
            <dt className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]">
              {row.icon}
              {row.label}
            </dt>
            <dd className="text-sm font-semibold">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * La ficha ampliada de una persona de la baraja.
 *
 * La tarjeta contesta «¿me interesa?» en dos segundos; esto contesta «¿por
 * qué?» sin sacar a nadie de la baraja — de ahí que sea un diálogo sobre la
 * carta y no una ruta: al cerrarlo, la carta sigue exactamente donde estaba.
 *
 * Las fotos van en vertical, una tras otra, con las secciones de datos
 * intercaladas: leer y mirar alternados mantienen el desplazamiento vivo,
 * mientras que seis fotos seguidas y luego un bloque de texto son dos pantallas
 * pegadas. Es la misma composición que la hoja del móvil.
 */
export function MemberDetailSheet({
  entry,
  footer,
  onClose,
}: Readonly<{ entry: GymDirectoryEntry | null; footer?: ReactNode; onClose: () => void }>) {
  if (!entry) return null;
  const sections = detailSectionsOf(entry);
  const photos = galleryOf(entry);

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <DialogContent
        className="max-w-md"
        title={
          entry.age !== null ? `${entry.displayName} · ${entry.age}` : entry.displayName
        }
      >
        <div className="grid gap-6">
          {photos.map((photo, position) => {
            const section = sections[position];
            return (
              <Fragment key={photo.id}>
                <div className="aspect-[4/5] w-full overflow-hidden rounded-[var(--radius-lg)]">
                  <DomainImage
                    alt={`Foto ${position + 1} de ${entry.displayName}`}
                    src={photo.url}
                  />
                </div>
                {section ? <DetailSectionBlock section={section} /> : null}
              </Fragment>
            );
          })}

          {/* Las secciones que no llegaron a intercalarse —menos fotos que
              bloques— van seguidas al final, en el mismo orden. */}
          {sections.slice(photos.length).map((section) => (
            <DetailSectionBlock key={section.key} section={section} />
          ))}

          {photos.length === 0 && sections.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">
              Esta persona aún no ha completado su perfil.
            </p>
          ) : null}

          {footer ? <div className="grid gap-2">{footer}</div> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
