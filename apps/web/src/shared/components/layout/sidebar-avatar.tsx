'use client';

import { useQuery } from '@tanstack/react-query';
import { profilePhotosService } from '@/features/profile/services/profile-photos-service';
import { queryKeys } from '@/shared/api/query-keys';
import type { SessionPrincipal } from '@/shared/api/contracts';
import { DomainImage } from '@/shared/components/media/domain-image';

/**
 * The sidebar footer's avatar: the member's first profile photo when there is one (the same query and
 * cache as the photo gallery, so an upload shows here at once), their initials otherwise. Staff roles
 * have no profile photos, so they are never asked for.
 */
export function SidebarAvatar({ session }: Readonly<{ session: SessionPrincipal }>) {
  const photos = useQuery({ queryKey: queryKeys.profilePhotos, queryFn: profilePhotosService.list, enabled: session.role === 'CLIENTE' });
  const photo = photos.data?.[0]?.url;
  return (
    <span aria-hidden className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--surface-highest)] text-[15px] font-semibold">
      {photo ? <DomainImage alt="" src={photo} /> : initialsOf(session.nombreCompleto ?? session.email)}
    </span>
  );
}

/** Initials for the sidebar avatar (an email falls back to its local part). */
function initialsOf(name: string): string {
  const parts = name.replace(/@.*/u, '').split(/[\s._-]+/u).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '·';
}
