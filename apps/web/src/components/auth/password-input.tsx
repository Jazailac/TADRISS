'use client';

import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ComponentProps } from 'react';
import { Input } from '../ui/field';

export function PasswordInput({
  showStrength = false,
  ...props
}: ComponentProps<'input'> & { showStrength?: boolean }) {
  const t = useTranslations('auth');
  const s = useTranslations('studio');
  const [visible, setVisible] = useState(false);
  const [length, setLength] = useState(0);
  const strength = length >= 16 ? 3 : length >= 10 ? 2 : length >= 8 ? 1 : 0;
  return (
    <div>
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
            className="inline-flex size-9 items-center justify-center rounded-md text-text-muted hover:text-text"
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
        <div className="mt-3">
          <div className="mb-2 flex justify-between gap-3 text-xs text-text-muted">
            <span>{s('strength')}</span>
            <span>{s(strength >= 3 ? 'strong' : strength >= 2 ? 'good' : 'weak')}</span>
          </div>
          <div className="flex gap-1" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full ${i <= strength && length > 0 ? 'bg-primary' : 'bg-border'}`}
              />
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-text-muted">{s('passwordHint')}</p>
        </div>
      ) : null}
    </div>
  );
}
