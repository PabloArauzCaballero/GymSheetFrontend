import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('panel', className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: Readonly<{ title: string; description?: string; action?: ReactNode; className?: string }>) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 border-b border-[var(--border-subtle)] p-5 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="grid gap-1">
        <h2 className="text-lg font-bold tracking-[-0.02em]">{title}</h2>
        {description ? (
          <p className="max-w-2xl text-sm leading-6 text-[var(--text-muted)]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}
