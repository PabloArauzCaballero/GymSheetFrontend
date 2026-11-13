import type { ReactNode } from 'react';

/**
 * El anillo. Degradado cuando queda algo sin ver, línea apagada cuando ya se
 * vio todo, y punteado cuando todavía no hay nada que ver.
 */
export function StoryRing({
  children,
  hasUnviewed,
  label,
  muted = false,
  onClick,
}: Readonly<{
  children: ReactNode;
  hasUnviewed: boolean;
  label: string;
  muted?: boolean;
  onClick: () => void;
}>) {
  const ring = muted
    ? 'border border-dashed border-[var(--border)]'
    : hasUnviewed
      ? 'bg-[linear-gradient(135deg,var(--volt),var(--accent-ink))]'
      : 'border border-[var(--border)]';
  return (
    <button
      aria-label={label}
      className={`tap hover-lift grid size-[4.5rem] place-items-center rounded-full p-[2px] ${ring}`}
      onClick={onClick}
      type="button"
    >
      <span className="grid size-full place-items-center rounded-full bg-[var(--background)] p-[2px]">
        {children}
      </span>
    </button>
  );
}
