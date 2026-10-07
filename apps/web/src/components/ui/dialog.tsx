'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cx } from './cx';

/**
 * Modal built on the native `<dialog>`: focus trap, Esc, inert background and top-layer
 * stacking come from the browser, so there is no portal or focus-management code to maintain.
 * Controlled: render it with `open` and handle `onClose` (Esc, backdrop click, close button).
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const t = useTranslations('common');
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop lands on the <dialog> itself, not on its content.
        if (event.target === ref.current) onClose();
      }}
      className={cx(
        'm-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto overscroll-contain rounded-2xl border border-border bg-surface p-0 text-text shadow-lg backdrop:bg-ink/55 backdrop:backdrop-blur-[2px] open:animate-rise',
        className,
      )}
    >
      {open ? (
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="display text-2xl">
                {title}
              </h2>
              {description ? (
                <p id={descId} className="mt-2 text-sm leading-relaxed text-text-muted">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('close')}
              className="-me-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-lg text-text-muted hover:bg-surface-muted hover:text-text"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <div className="mt-6">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
