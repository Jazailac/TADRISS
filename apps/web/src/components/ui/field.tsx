import type { ComponentProps, ReactNode } from 'react';
import { cx } from './cx';

export function Label({ className, ...rest }: ComponentProps<'label'>) {
  return <label {...rest} className={cx('text-sm font-medium text-text', className)} />;
}

export const inputStyles =
  'h-11 w-full rounded-md border border-border-strong/70 bg-surface px-3.5 text-[0.9375rem] text-text shadow-xs transition-[border-color,box-shadow] placeholder:text-text-muted/70 hover:border-border-strong focus:border-primary focus:ring-4 focus:ring-primary/12 focus:outline-none aria-invalid:border-danger aria-invalid:focus:ring-danger/12 disabled:opacity-60';

type InputProps = ComponentProps<'input'> & { icon?: ReactNode; trailing?: ReactNode };

/**
 * Input with optional leading icon and trailing slot. Uses logical padding (ps/pe) for RTL.
 * `dir` is applied to the wrapper so a forced-LTR field (email, phone) keeps its icon and
 * padding on the same side inside an RTL page.
 */
export function Input({ icon, trailing, className, dir, ...rest }: InputProps) {
  return (
    <div className="relative" dir={dir}>
      {icon ? (
        <span className="pointer-events-none absolute inset-y-0 start-3.5 flex items-center text-text-muted">
          {icon}
        </span>
      ) : null}
      <input
        {...rest}
        className={cx(inputStyles, icon ? 'ps-10' : null, trailing ? 'pe-11' : null, className)}
      />
      {trailing ? (
        <span className="absolute inset-y-0 end-1 flex items-center">{trailing}</span>
      ) : null}
    </div>
  );
}

export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="text-sm text-danger">
      {children}
    </p>
  );
}

export function Field({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('grid gap-1.5', className)}>{children}</div>;
}
