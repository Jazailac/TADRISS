'use client';

import {
  fieldErrors,
  loginInput,
  setPasswordInput,
  signupInput,
  type ValidationKey,
} from '@tadriss/shared';
import { AlertCircle, ArrowRight, MailCheck, Mail } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useActionState, useState, type SubmitEvent } from 'react';
import type { AuthState } from '@/app/actions/auth';
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
const schemas = { login: loginInput, signup: signupInput, setPassword: setPasswordInput } as const;

/**
 * Validates with the shared zod schema on the client for instant feedback, then posts to the
 * server action, which validates again (the server never trusts the client).
 */
export function AuthForm({
  schema: schemaName,
  action,
  fields,
  submitLabel,
  next,
  hidden,
}: {
  schema: keyof typeof schemas;
  action: (prev: AuthState, fd: FormData) => Promise<AuthState>;
  fields: FieldSpec[];
  submitLabel: string;
  next?: string;
  /** Values the visitor does not type, e.g. the institution kind chosen on the landing page. */
  hidden?: Record<string, string>;
}) {
  const schema = schemas[schemaName];
  const locale = useLocale();
  const v = useTranslations('validation');
  const e = useTranslations('errors');
  const n = useTranslations('auth.notices');
  const [state, formAction, pending] = useActionState(action, null);
  const [clientErrors, setClientErrors] = useState<Partial<Record<string, ValidationKey>> | null>(
    null,
  );

  const errors = clientErrors ?? state?.fields ?? {};

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const parsed = schema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      event.preventDefault();
      const errs = fieldErrors(parsed.error);
      setClientErrors(errs);
      const first = fields.find((f) => errs[f.name]);
      if (first) (form.elements.namedItem(first.name) as HTMLElement | null)?.focus();
      return;
    }
    setClientErrors(null);
  };

  if (state?.notice === 'check_email') {
    return (
      <div role="status" className="rounded-xl border border-success/20 bg-success-soft/40 p-6">
        <span className="inline-flex size-12 items-center justify-center rounded-xl bg-success-soft text-success">
          <MailCheck className="size-5" aria-hidden />
        </span>
        <h2 className="display mt-5 text-2xl font-medium">{n('checkEmailTitle')}</h2>
        <p className="mt-3 text-sm leading-7 text-text-muted">{n('checkEmailBody')}</p>
      </div>
    );
  }

  const serverError = state?.error && state.error !== 'validation' ? state.error : null;

  return (
    <form
      noValidate
      action={formAction}
      onSubmit={onSubmit}
      onBlur={(event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || !fields.some((f) => f.name === target.name))
          return;
        const form = event.currentTarget;
        const parsed = schema.safeParse(Object.fromEntries(new FormData(form)));
        const issues = parsed.success ? {} : fieldErrors(parsed.error);
        setClientErrors((current) => ({
          ...state?.fields,
          ...current,
          [target.name]: issues[target.name],
        }));
      }}
      className="grid grid-cols-2 gap-x-4 gap-y-2"
    >
      <input type="hidden" name="locale" value={locale} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      {serverError ? (
        <p
          role="alert"
          className="col-span-2 flex gap-2.5 rounded-lg bg-danger-soft p-3.5 text-sm text-danger"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {e(serverError)}
        </p>
      ) : null}

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
              <PasswordInput
                {...common}
                showStrength={schemaName !== 'login' && f.name === 'password'}
              />
            ) : (
              <Input
                {...common}
                type={f.kind}
                inputMode={f.kind === 'email' ? 'email' : undefined}
                dir={f.kind === 'email' ? 'ltr' : undefined}
                placeholder={f.placeholder}
                defaultValue={state?.values?.[f.name]}
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

      <Button type="submit" size="lg" className="col-span-2 mt-2 justify-between" pending={pending}>
        {submitLabel}
        {!pending ? <ArrowRight className="rtl-flip size-4" aria-hidden /> : null}
      </Button>
    </form>
  );
}
