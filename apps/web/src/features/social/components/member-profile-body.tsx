'use client';

import { Trophy } from 'lucide-react';
import type { EarnedBadge, MemberProfile } from '@/shared/api/schemas';
import { withAlpha } from '@/features/progression/components/progression-colors';
import { ProgressionIcon } from '@/features/progression/components/progression-icon';
import { DomainImage } from '@/shared/components/media/domain-image';
import { PersonAvatar } from '@/shared/components/media/person-avatar';
import { chipHeartbeat } from '@/shared/components/ui/badge';
import { levelTitle } from './directory-labels';
import { DetailSectionBlock, detailSectionsOf } from './member-detail-sheet';
import { socialStatusLabels } from './social-status-labels';

/**
 * La ficha de un socio: identidad, rango, datos y lo que ha conseguido.
 *
 * Una sola pieza para los dos sitios que la enseñan —la ruta `/perfil/[userId]`
 * y el diálogo rápido de las listas de interacciones—, porque son la misma
 * información y dos copias es como acaban divergiendo. Lo que cambia entre
 * ambos es el marco, no el contenido.
 *
 * El diálogo anterior enseñaba una tira de fotos, la edad, el objetivo y la
 * sucursal. Faltaba lo que el contrato ya traía y el móvil sí pinta: el rango
 * con sus puntos, el estado social, el género y el nivel de experiencia.
 */
export function MemberProfileBody({
  member,
  compact = false,
}: Readonly<{ member: MemberProfile; compact?: boolean }>) {
  const sections = detailSectionsOf(member);

  return (
    <div className="grid gap-7">
      {compact ? null : (
        <div className="grid justify-items-center gap-3 py-2 text-center">
          <PersonAvatar
            className="size-28"
            name={member.displayName}
            photoUrl={member.photoUrl}
          />
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">
            {member.displayName}
            {member.age !== null ? (
              <span className="ml-2 font-normal text-[var(--text-muted)]">{member.age}</span>
            ) : null}
          </h1>
          {member.levelCode ? (
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-ink)]">
              <Trophy aria-hidden className="size-4" />
              {levelTitle(member.levelCode)}
              {typeof member.points === 'number'
                ? ` · ${member.points.toLocaleString('es-ES')} pts`
                : ''}
            </p>
          ) : null}
          {member.socialStatus ? (
            <p className="text-sm text-[var(--text-muted)]">
              {socialStatusLabels[member.socialStatus]}
            </p>
          ) : null}
        </div>
      )}

      {member.photos.length > 0 ? (
        <div className="nav-scroll flex gap-2 overflow-x-auto pb-1">
          {member.photos.map((photo) => (
            <div
              className="h-64 w-48 shrink-0 overflow-hidden rounded-[var(--radius-lg)]"
              key={photo.id}
            >
              <DomainImage alt={`Foto de ${member.displayName}`} src={photo.url} />
            </div>
          ))}
        </div>
      ) : null}

      {sections.map((section) => (
        <DetailSectionBlock key={section.key} section={section} />
      ))}

      <section className="grid gap-3">
        <h2 className="data-label text-[var(--text-muted)]">
          Insignias · {member.badges.length}
        </h2>
        {member.badges.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {member.badges.map((badge) => (
              <BadgeChip badge={badge} key={badge.code} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            Todavía no ha conseguido ninguna. Las suyas aparecerán aquí cuando las gane.
          </p>
        )}
      </section>
    </div>
  );
}

/** Sólo las conseguidas: mirar a alguien no puede revelar lo que le falta. */
function BadgeChip({ badge }: Readonly<{ badge: EarnedBadge }>) {
  return (
    <li
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${chipHeartbeat}`}
      style={{
        borderColor: withAlpha(badge.color, 0.35),
        backgroundColor: withAlpha(badge.color, 0.12),
      }}
      title={badge.description}
    >
      <ProgressionIcon className="size-4" name={badge.icon} style={{ color: badge.color }} />
      {badge.name}
    </li>
  );
}
