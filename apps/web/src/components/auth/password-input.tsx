'use client';

import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Input } from '../ui/field';

export function PasswordInput({
  showStrength = false,
  ...props
}: ComponentProps<'input'> & { showStrength?: boolean }) {
  const t = useTranslations('auth');
  const s = useTranslations('studio');
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [length, setLength] = useState(0);
  useEffect(() => {
    const form = container.current?.querySelector('input')?.form;
    if (!form) return;
    const reset = () => {
      setLength(0);
      setVisible(false);
    };
    form.addEventListener('reset', reset);
    return () => {
      form.removeEventListener('reset', reset);
    };
  }, []);
  const minimumMet = length >= 8;
  const filledSegments = Math.min(4, Math.floor(length / 2));
  return (
    <div ref={container}>
      <Input
        {...props}
        onChange={(event) => {
          setLength(event.target.value.length);
          props.onChange?.(event);
        }}
        type={visible ? 'text' : 'password'}
        icon={<LockKeyhole className="size-4" strokeWidth={1.75} aria-hidden />}
        trailing={
          <button
            type="button"
            onClick={() => {
              setVisible((v) => !v);
            }}
            aria-label={visible ? t('hidePassword') : t('showPassword')}
            aria-pressed={visible}
            className="inline-flex size-9 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
          >
            {visible ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        }
      />
      {showStrength ? (
        <div className="mt-3 rounded-lg bg-surface-muted/50 p-3">
          <div className="mb-2 flex justify-between gap-3 text-xs text-text-muted">
            <span>{s('strength')}</span>
            <span>{s(minimumMet ? 'good' : 'weak')}</span>
          </div>
          <div className="flex gap-1.5" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors duration-200 ${i < filledSegments ? 'bg-primary' : 'bg-border'}`}
              />
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-text-muted">{s('passwordHint')}</p>
        </div>
      ) : null}
    </div>
  );
}
