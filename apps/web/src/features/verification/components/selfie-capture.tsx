'use client';

import { verificationCopy } from '@gymsheet/domain';
import { ImageUp, RotateCcw, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CameraCapture } from '@/shared/components/media/camera-capture';
import { Button } from '@/shared/components/ui/button';

type Shot = { blob: Blob; src: string; name: string; objectUrl: boolean };

const ACCEPT = 'image/jpeg,image/png,image/heic,image/heif';

/**
 * Front camera (getUserMedia, `facingMode: user`) with a file fallback that
 * asks phones for the selfie camera (`capture="user"`). Everything stays
 * local until «Enviar selfie»: preview, retake, then one upload.
 */
export function SelfieCapture({
  sending,
  disabled = false,
  onSend,
}: Readonly<{ sending: boolean; disabled?: boolean; onSend: (blob: Blob, name: string) => void }>) {
  const [shot, setShot] = useState<Shot | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Object URLs are freed when replaced or on unmount.
  useEffect(() => () => {
    if (shot?.objectUrl) URL.revokeObjectURL(shot.src);
  }, [shot]);

  if (shot) {
    return (
      <div className="grid gap-4">
        <div className="overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-low)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- local preview (data/blob URL), never remote. */}
          <img alt={verificationCopy.previewAlt} className="mx-auto max-h-[60vh] w-full object-contain" src={shot.src} />
        </div>
        <p className="t-footnote text-[var(--text-muted)]">{verificationCopy.privacyNote}</p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={sending} onClick={() => onSend(shot.blob, shot.name)} loading={sending} type="button" variant="primary">
            <Send aria-hidden className="size-4" />
            {verificationCopy.send}
          </Button>
          <Button disabled={sending} onClick={() => setShot(null)} type="button" variant="ghost">
            <RotateCcw aria-hidden className="size-4" />
            {verificationCopy.retake}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <CameraCapture
        captureLabel={verificationCopy.takeSelfie}
        disabled={disabled}
        onCapture={(frame) => setShot({ blob: frame.blob, src: frame.dataUrl, name: 'selfie.jpg', objectUrl: false })}
      />
      <input
        accept={ACCEPT}
        aria-label={verificationCopy.chooseFile}
        capture="user"
        className="sr-only"
        data-testid="selfie-file-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) setShot({ blob: file, src: URL.createObjectURL(file), name: file.name || 'selfie.jpg', objectUrl: true });
        }}
        ref={fileInput}
        tabIndex={-1}
        type="file"
      />
      <Button className="justify-self-start" disabled={disabled} onClick={() => fileInput.current?.click()} size="sm" type="button" variant="ghost">
        <ImageUp aria-hidden className="size-4" />
        {verificationCopy.chooseFile}
      </Button>
    </div>
  );
}
