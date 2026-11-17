'use client';

import { safeHref } from '@gymsheet/domain';
import type { ModerationCaseContent } from '@gymsheet/schemas';
import { MessageSquareQuote, Music } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { DomainImage } from '@/shared/components/media/domain-image';
import type { ModerationCaseDetail } from '@/features/moderation/services/moderation-service';
import { BusinessProfileBody, ListingBody } from './moderation-preview-business';
import { OrderBody } from './moderation-preview-order';
import { ExerciseBody, RoutineBody } from './moderation-preview-training';

function Muted({ children }: Readonly<{ children: string }>) {
  return <p className="text-sm text-[var(--text-muted)]">{children}</p>;
}

function Photo({ alt, src }: Readonly<{ alt: string; src: string }>) {
  return (
    <div className="relative aspect-square w-40 overflow-hidden rounded-[8px] bg-[var(--surface-low)]">
      <DomainImage alt={alt} className="object-cover" src={src} />
    </div>
  );
}

/** Comment attachment kinds the backend stores (`community.schemas.ts`) that render as a picture. */
const IMAGE_ATTACHMENTS = new Set(['IMAGEN', 'GIF', 'STICKER']);

function CommentBody({ comment }: Readonly<{ comment: Extract<ModerationCaseContent, { kind: 'COMMENT' }> }>) {
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <MessageSquareQuote aria-hidden className="size-4 text-[var(--text-muted)]" />
        Comentario denunciado
      </p>
      {comment.text ? (
        <blockquote className="border-l-2 border-[var(--border)] pl-3 text-sm">{comment.text}</blockquote>
      ) : null}
      {comment.attachmentUrl ? (
        IMAGE_ATTACHMENTS.has(comment.attachmentType ?? '') ? (
          <Photo alt="Imagen adjunta al comentario" src={comment.attachmentUrl} />
        ) : safeHref(comment.attachmentUrl) ? (
          <a className="text-sm underline underline-offset-2" href={safeHref(comment.attachmentUrl)} rel="noreferrer noopener" target="_blank">
            Abrir el adjunto
          </a>
        ) : (
          <Muted>Adjunto con un enlace no seguro (no se abre).</Muted>
        )
      ) : null}
      {comment.deletedByAuthor ? <Muted>Su autor lo borró después de la denuncia.</Muted> : null}
    </div>
  );
}

type MediaContent = Extract<ModerationCaseContent, { kind: 'REEL' | 'STORY' | 'PROFILE_PHOTO' }>;

function MediaBody({ media }: Readonly<{ media: MediaContent }>) {
  const isVideo = media.kind === 'REEL' || (media.mediaType ?? '').toUpperCase().startsWith('VIDEO');
  return (
    <div className="flex flex-col gap-2">
      {isVideo ? (
        <video
          className="aspect-[9/16] w-40 rounded-[8px] bg-[var(--surface-low)]"
          controls
          preload="metadata"
          src={media.mediaUrl.startsWith('/') ? `/api/backend${media.mediaUrl}` : media.mediaUrl}
        />
      ) : (
        <Photo alt="Contenido denunciado" src={media.mediaUrl} />
      )}
      {media.caption ? <p className="text-sm">{media.caption}</p> : null}
    </div>
  );
}

function ContentBody({ content }: Readonly<{ content: ModerationCaseContent }>) {
  switch (content.kind) {
    case 'ROUTINE':
      return <RoutineBody routine={content} />;
    case 'EXERCISE':
      return <ExerciseBody exercise={content} />;
    case 'COMMENT':
      return <CommentBody comment={content} />;
    case 'BUSINESS_LISTING':
      return <ListingBody listing={content} />;
    case 'BUSINESS_PROFILE':
      return <BusinessProfileBody profile={content} />;
    case 'PAYMENT_ORDER':
      return <OrderBody order={content} />;
    case 'USER':
      return (
        <div className="flex flex-col gap-2">
          <p className="text-base font-semibold">{content.displayName}</p>
          {content.mainPhotoUrl ? (
            <Photo alt={`Foto principal de ${content.displayName}`} src={content.mainPhotoUrl} />
          ) : (
            <Muted>Sin foto de perfil.</Muted>
          )}
        </div>
      );
    case 'MUSIC_PLAYLIST':
      return (
        <p className="flex items-center gap-2 text-sm">
          <Music aria-hidden className="size-4 text-[var(--text-muted)]" />
          {safeHref(content.url) ? (
            <a className="font-semibold underline underline-offset-2" href={safeHref(content.url)} rel="noreferrer noopener" target="_blank">
              {content.name}
            </a>
          ) : (
            <span className="font-semibold">{content.name}</span>
          )}
        </p>
      );
    default:
      return <MediaBody media={content} />;
  }
}

/**
 * The reported content, read from the case file (`content`): the moderator
 * cannot open the author's routes, so nothing else is fetched here.
 */
export function ContentPreview({
  content,
  contentUnavailableReason,
}: Readonly<Pick<ModerationCaseDetail, 'content' | 'contentUnavailableReason'>>) {
  // A chat message is reviewed from its evidence copy, not from here.
  if (!content && contentUnavailableReason !== 'ERASED') return null;
  return (
    <Card>
      <CardContent className="p-4" data-testid="vista-previa">
        {content ? (
          <ContentBody content={content} />
        ) : (
          <Muted>Este contenido ya se eliminó: solo quedan los reportes.</Muted>
        )}
      </CardContent>
    </Card>
  );
}
