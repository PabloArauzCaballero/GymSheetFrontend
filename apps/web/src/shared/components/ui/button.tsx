import Link from 'next/link';
import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

/**
 * Variantes del `Button` del móvil (`apps/mobile/src/components/ui.tsx`):
 * - primary: relleno jade en degradado (`accentGradient`) con halo debajo —el
 *   botón se lee como fuente de luz—. Una por pantalla.
 * - secondary: relleno `surfaceHighest`, sin borde.
 * - danger: relleno de error con texto del lienzo.
 * - ghost: transparente con contorno de control (≥ 3:1).
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border-transparent bg-[linear-gradient(135deg,color-mix(in_srgb,var(--volt)_78%,white)_0%,var(--volt)_100%)] text-[var(--accent-contrast)] shadow-[0_10px_28px_-8px_color-mix(in_srgb,var(--volt)_55%,transparent)] hover:brightness-110',
  secondary:
    'border-transparent bg-[var(--surface-highest)] text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--surface-highest)_86%,var(--text))]',
  danger:
    'border-transparent bg-[var(--danger)] text-[var(--background)] hover:brightness-110',
  ghost:
    'border-[var(--border-control,var(--border))] bg-transparent text-[var(--text)] hover:bg-[var(--surface-high)]',
};

/** Alto mínimo 48 en todos los tamaños, como el móvil: 48 · 52 · 56. */
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-12 rounded-[var(--radius-md)] px-4 text-[15px]',
  md: 'min-h-[52px] rounded-[var(--radius-lg)] px-5 text-[17px]',
  lg: 'min-h-14 rounded-[var(--radius-lg)] px-6 text-[17px]',
  icon: 'size-11 rounded-full p-0',
};

export function buttonClasses(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md') {
  return cn(
    'relative inline-flex items-center justify-center gap-2 overflow-hidden border font-semibold leading-tight transition-[transform,background-color,border-color,color,filter,box-shadow] duration-[var(--dur-1)] ease-[var(--ease-out)] active:scale-[0.96] motion-reduce:active:scale-100 disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[var(--surface-high)] disabled:bg-none disabled:text-[var(--text-disabled)] disabled:shadow-none',
    variantClasses[variant],
    sizeClasses[size],
    // Botón de icono del móvil (`IconButton`): círculo de 44 en `surfaceHigh`,
    // sin contorno. Solo para las variantes neutras; primario y peligro
    // conservan su relleno.
    size === 'icon' &&
      (variant === 'ghost' || variant === 'secondary') &&
      'border-transparent bg-[var(--surface-high)] text-[var(--text)] hover:bg-[var(--surface-highest)]',
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'secondary', size = 'md', loading = false, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(buttonClasses(variant, size), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
});

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function ButtonLink({
  className,
  variant = 'secondary',
  size = 'md',
  href,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={cn(buttonClasses(variant, size), className)} href={href} {...props}>
      {children}
    </Link>
  );
}
