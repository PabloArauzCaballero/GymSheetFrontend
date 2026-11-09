import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Tarjeta del móvil (`layout.tsx` → `Card`): `surfaceLow`, radio 20, sombra e1,
 * sin borde visible. La clase `panel` lleva la superficie (ver `globals.css`).
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('panel', className)} {...props} />;
}

/**
 * Cabecera de tarjeta: título `headline` (17/600) y detalle `subhead` (15)
 * en tono secundario, separados del contenido por espacio, no por una raya.
 */
export function CardHeader({
  title,
  description,
  action,
  className,
}: Readonly<{ title: string; description?: string; action?: ReactNode; className?: string }>) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 px-5 pb-1 pt-5 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="grid gap-1">
        <h2 className="text-[17px] font-semibold leading-[22px]">{title}</h2>
        {description ? (
          <p className="max-w-2xl text-[15px] leading-5 text-[var(--text-muted)]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}
