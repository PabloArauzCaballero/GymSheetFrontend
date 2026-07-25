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

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border-[var(--volt)] bg-[var(--volt)] text-black hover:bg-[var(--volt-dim)] hover:shadow-[0_8px_28px_-8px_rgb(195_244_0/0.55)]',
  secondary:
    'border-[var(--border)] bg-[var(--surface-low)] text-white hover:border-[#3a3a3a] hover:bg-[var(--surface)]',
  danger: 'border-[#63302c] bg-[#241211] text-[#ffb4ab] hover:bg-[#351816]',
  ghost:
    'border-transparent bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-white',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-6 text-base',
  icon: 'size-10 p-0',
};

export function buttonClasses(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md') {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-[4px] border font-semibold transition-[transform,background-color,border-color,box-shadow,color] duration-150 ease-out active:scale-[0.96] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45',
    variantClasses[variant],
    sizeClasses[size],
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
