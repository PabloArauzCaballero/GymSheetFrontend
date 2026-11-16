import { chatDotFigure } from '@gymsheet/domain';
import type { CSSProperties } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Chat's glowing dot (`apps/mobile/src/components/chat-dot.tsx`). `halo` is the
 * surface under it, drawn as a 2 px ring so the dot keeps ≥3:1 anywhere.
 * Keyed by `pulseKey`, the pulse ring replays only when something new arrived.
 * Hidden from assistive tech: the control that owns it says the words.
 */
export function ChatDot({ count, halo, pulseKey = 0, className, tone = 'alert' }: Readonly<{ count?: number; halo?: string; pulseKey?: number; className?: string; tone?: 'alert' | 'spark' }>) {
  // `spark` is decoration (the deck button's glowing tip): Chat ink, never a figure, never the alert pink.
  const figure = tone === 'alert' && count && count > 0 ? chatDotFigure(count) : null;
  return (
    <span
      aria-hidden
      className={cn('chat-dot', className)}
      data-figure={figure ? '' : undefined}
      data-pulse={tone === 'alert' && pulseKey > 0 ? '' : undefined}
      data-tone={tone}
      data-testid="chat-dot"
      key={pulseKey}
      style={halo ? ({ '--chat-halo': halo } as CSSProperties) : undefined}
    >
      {figure}
    </span>
  );
}
