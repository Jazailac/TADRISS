'use client';

import { fieldErrors, loginInput, signupInput, type ValidationKey } from '@tadriss/shared';
import { Info, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type SubmitEvent } from 'react';
import { Button } from '../ui/button';
import { Field, FieldError, Input, Label } from '../ui/field';
import { PasswordInput } from './password-input';

export type FieldSpec = {
  name: string;
  label: string;
  placeholder?: string;
  kind: 'text' | 'email' | 'password';
  autoComplete: string;
  half?: boolean;
};

// Schemas are resolved here by name: zod schemas are class instances and cannot be
// passed as props from a Server Component.
const schemas = { login: loginInput, signup: signupInput } as const;

/**
 * Validates with the shared zod schema (same rules the server will enforce in Phase 1),
 * shows translated inline errors and focuses the first invalid field.
 * Submission is not wired yet: on success it shows a notice instead of a dead end.
 */
export function AuthForm({
  schema: schemaName,
  fields,
  submitLabel,
  notice: noticeText,
}: {
  schema: keyof typeof schemas;
  fields: FieldSpec[];
  submitLabel: string;
  notice: string;
}) {
  const schema = schemas[schemaName];
  const v = useTranslations('validation');
  const [errors, setErrors] = useState<Partial<Record<string, ValidationKey>>>({});
  const [notice, setNotice] = useState(false);

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const parsed = schema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error);
      setErrors(errs);
      setNotice(false);
      const first = fields.find((f) => errs[f.name]);
      if (first) (form.elements.namedItem(first.name) as HTMLElement | null)?.focus();
      return;
    }
    setErrors({});
    setNotice(true);
  };

  return (
    <form noValidate onSubmit={onSubmit} className="grid grid-cols-2 gap-x-3 gap-y-5">
      {fields.map((f) => {
        const err = errors[f.name];
        const errId = `${f.name}-error`;
        const common = {
          id: f.name,
          name: f.name,
          autoComplete: f.autoComplete,
          'aria-invalid': err ? true : undefined,
          'aria-describedby': err ? errId : undefined,
        };
        return (
          <Field key={f.name} className={f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}>
            <Label htmlFor={f.name}>{f.label}</Label>
            {f.kind === 'password' ? (
              <PasswordInput {...common} />
            ) : (
              <Input
                {...common}
                type={f.kind}
                inputMode={f.kind === 'email' ? 'email' : undefined}
                dir={f.kind === 'email' ? 'ltr' : undefined}
                placeholder={f.placeholder}
                icon={
                  f.kind === 'email' ? (
                    <Mail className="size-4" strokeWidth={1.75} aria-hidden />
                  ) : undefined
                }
              />
            )}
            <FieldError id={errId}>{err ? v(err) : null}</FieldError>
          </Field>
        );
      })}

      <Button type="submit" size="lg" className="col-span-2 mt-1">
        {submitLabel}
      </Button>

      {notice ? (
        <p
          role="status"
          className="col-span-2 flex gap-2.5 rounded-lg bg-info-soft p-3.5 text-sm text-info"
        >
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {noticeText}
        </p>
      ) : null}
    </form>
  );
}
