import { cn } from '@/shared/lib/cn';
import { DomainImage } from './domain-image';

/**
 * Iniciales de un nombre: una o dos letras, nunca más.
 *
 * Tres iniciales dejan de leerse como una persona y empiezan a leerse como una
 * sigla, y en un círculo de 40 px no caben sin encogerse.
 */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/u).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0]?.[0] ?? '';
  const second = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return `${first}${second}`.toUpperCase();
}

const sizeClasses = {
  sm: 'size-10 text-xs',
  md: 'size-14 text-sm',
  lg: 'size-16 text-base',
} as const;

/**
 * Avatar circular de una persona. Sin foto cae a las iniciales sobre el acento:
 * un icono genérico repetido veinte veces en una lista no distingue a nadie.
 */
export function PersonAvatar({
  className,
  name,
  photoUrl,
  size = 'sm',
}: Readonly<{
  className?: string;
  name: string;
  photoUrl: string | null;
  size?: keyof typeof sizeClasses;
}>) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--volt)] font-semibold text-[var(--accent-contrast)]',
        sizeClasses[size],
        className,
      )}
    >
      {photoUrl ? <DomainImage alt={`Foto de ${name}`} src={photoUrl} /> : initialsOf(name)}
    </span>
  );
}
