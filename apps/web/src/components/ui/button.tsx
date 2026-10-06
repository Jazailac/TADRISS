import type { ComponentProps, ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { cx } from './cx';
import { Spinner } from './spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'ink' | 'accent';
type Size = 'sm' | 'md' | 'lg';

const base =
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-[background-color,box-shadow,transform,color] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-60 aria-busy:cursor-progress';

const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-sm hover:bg-primary/92 shadow-primary/20 ring-1 ring-inset ring-text/10',
  secondary:
    'bg-surface text-text ring-1 ring-inset ring-border-strong/70 shadow-xs hover:bg-surface-muted',
  ghost: 'text-text-muted hover:bg-surface-muted hover:text-text',
  ink: 'bg-ink text-ink-foreground shadow-md hover:bg-ink/90 dark:bg-text dark:text-background',
  accent: 'bg-accent text-accent-foreground shadow-sm hover:bg-accent/90',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-[0.9375rem]',
  lg: 'h-12 px-6 text-base',
};

export const buttonStyles = ({
  variant = 'primary',
  size = 'md',
}: { variant?: Variant; size?: Size } = {}) => cx(base, variants[variant], sizes[size]);

type ButtonProps = ComponentProps<'button'> & {
  variant?: Variant;
  size?: Size;
  pending?: boolean;
  icon?: ReactNode;
};

/** Button with a built-in pending state: spinner replaces the icon, label stays for layout stability. */
export function Button({
  variant,
  size,
  pending = false,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled ?? pending}
      aria-busy={pending || undefined}
      className={cx(buttonStyles({ variant, size }), className)}
    >
      {pending ? <Spinner label={false} /> : icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
};

export function ButtonLink({ variant, size, icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link {...rest} className={cx(buttonStyles({ variant, size }), className)}>
      {icon}
      {children}
    </Link>
  );
}
