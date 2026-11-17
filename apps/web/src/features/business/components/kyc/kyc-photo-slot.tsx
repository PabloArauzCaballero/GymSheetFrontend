'use client';

import { CheckCircle2, ImageUp, RotateCcw, Trash2, TriangleAlert } from 'lucide-react';
import { useId, useRef, type ReactNode } from 'react';
import { kycCopy, type DocumentVerdict, type KycDocumentSlot } from '@gymsheet/domain';
import { Badge } from '@/shared/components/ui/badge';
import { Button, buttonClasses } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/cn';

/**
 * One photo of step 6: what it is, its verdict the moment it uploads
 * («Legible ✓» or «Vuelve a tomarla» with why) and the file picker. The
 * picker is a native file input (camera or gallery on a phone), JPG/PNG only.
 */
export function KycPhotoSlot({
  slot,
  verdict,
  present,
  busy,
  error,
  disabled = false,
  onPick,
  onRemove,
  children,
}: Readonly<{
  slot: KycDocumentSlot;
  verdict: DocumentVerdict | null;
  present: boolean;
  busy: boolean;
  error: string | null;
  disabled?: boolean;
  onPick: (file: File) => void;
  onRemove?: () => void;
  children?: ReactNode;
}>) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const status = present ? (verdict ? verdict.label : kycCopy.documents.logoReady) : slot.required ? kycCopy.documents.missing : kycCopy.documents.optional;
  const tone = !present ? (slot.required ? 'warning' : 'neutral') : verdict && !verdict.readable ? 'danger' : 'success';

  return (
    <li className="grid gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4" data-testid={`kyc-slot-${slot.key}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <h3 className="font-semibold" id={`${id}-title`}>
            {slot.title}
          </h3>
          <p className="t-footnote text-[var(--text-muted)]">{slot.hint}</p>
        </div>
        <Badge tone={tone}>
          {tone === 'success' ? <CheckCircle2 aria-hidden className="size-3.5" /> : tone === 'danger' ? <TriangleAlert aria-hidden className="size-3.5" /> : null}
          {status}
        </Badge>
      </div>
      {verdict && !verdict.readable ? (
        <p className="t-subhead text-[var(--danger-text)]" role="status">
          {verdict.reason}
        </p>
      ) : null}
      {children}
      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <input
          accept="image/jpeg,image/png"
          aria-labelledby={`${id}-title`}
          className="sr-only"
          disabled={disabled || busy}
          id={id}
          onChange={(event) => {
            const file = event.target.files?.[0];
            // The same file can be picked again after a refusal.
            event.target.value = '';
            if (file) onPick(file);
          }}
          ref={input}
          tabIndex={-1}
          type="file"
        />
        <Button
          disabled={disabled}
          loading={busy}
          onClick={() => input.current?.click()}
          size="sm"
          type="button"
          variant={present ? 'ghost' : 'secondary'}
        >
          {busy ? null : present ? <RotateCcw aria-hidden className="size-4" /> : <ImageUp aria-hidden className="size-4" />}
          {busy ? kycCopy.documents.uploading : present ? kycCopy.documents.retake : kycCopy.documents.choose}
          <span className="sr-only">: {slot.title}</span>
        </Button>
        {present && onRemove ? (
          <button
            className={cn(buttonClasses('ghost', 'sm'), 'text-[var(--text-muted)]')}
            disabled={busy}
            onClick={onRemove}
            type="button"
          >
            <Trash2 aria-hidden className="size-4" />
            {kycCopy.documents.remove}
            <span className="sr-only">: {slot.title}</span>
          </button>
        ) : null}
      </div>
    </li>
  );
}
