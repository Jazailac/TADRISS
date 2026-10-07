'use client';

import {
  classInput,
  examInput,
  feePlanInput,
  fieldErrors,
  generateInvoicesInput,
  homeworkInput,
  inviteInput,
  invoiceInput,
  paymentInput,
  slotInput,
  subjectInput,
  updateClassInput,
  updateExamInput,
  updateFeePlanInput,
  updateHomeworkInput,
  updateMemberInput,
  updateSlotInput,
  updateSubjectInput,
  voidInput,
  type ValidationKey,
} from '@tadriss/shared';
import { AlertCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useActionState, useEffect, useState, type SubmitEvent } from 'react';
import type { FormState } from '@/lib/form-state';
import { Button } from '../ui/button';
import { Field, FieldError, Input, Label, Select, Textarea } from '../ui/field';

export type FormField = {
  name: string;
  label: string;
  kind: 'text' | 'email' | 'number' | 'decimal' | 'select' | 'time' | 'date' | 'textarea';
  /** Required for `select`. */
  options?: { value: string; label: string }[];
  autoComplete?: string;
  placeholder?: string;
  half?: boolean;
};

// Schemas are resolved by name: zod schemas are class instances and can't cross the
// server→client boundary as props.
const schemas = {
  invite: inviteInput,
  updateMember: updateMemberInput,
  createClass: classInput,
  updateClass: updateClassInput,
  createSlot: slotInput,
  updateSlot: updateSlotInput,
  createSubject: subjectInput,
  updateSubject: updateSubjectInput,
  createHomework: homeworkInput,
  updateHomework: updateHomeworkInput,
  createExam: examInput,
  updateExam: updateExamInput,
  createFeePlan: feePlanInput,
  updateFeePlan: updateFeePlanInput,
  createInvoice: invoiceInput,
  generateInvoices: generateInvoicesInput,
  recordPayment: paymentInput,
  voidDocument: voidInput,
} as const;

/**
 * Dialog form: validates with the shared zod schema for instant inline errors, then posts to a
 * server action that validates again. `onDone` fires once when the action reports success.
 */
export function ActionForm({
  schema: schemaName,
  action,
  fields,
  hidden,
  defaults,
  submitLabel,
  cancelLabel,
  onCancel,
  onDone,
  onFieldChange,
}: {
  schema: keyof typeof schemas;
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  fields: FormField[];
  hidden?: Record<string, string>;
  defaults?: Record<string, string>;
  submitLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  onDone: (values: Record<string, string>) => void;
  /** Called as a field changes, for UI beside the form that depends on it (e.g. a price preview). */
  onFieldChange?: (name: string, value: string) => void;
}) {
  const schema = schemas[schemaName];
  const locale = useLocale();
  const v = useTranslations('validation');
  const e = useTranslations('errors');
  const [state, formAction, pending] = useActionState(action, null);
  const [clientErrors, setClientErrors] = useState<Partial<Record<string, ValidationKey>> | null>(
    null,
  );

  useEffect(() => {
    if (state?.done) onDone(state.values ?? {});
    // onDone identity changes every render of the parent; only the transition to done matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.done]);

  const errors = clientErrors ?? state?.fields ?? {};
  // Not hidden while the user edits: blur-validation would remove the alert on mousedown, the
  // form would shrink and the submit button would slide away from the click. A new submit
  // replaces the state, which clears it.
  const serverError = state?.error && state.error !== 'validation' ? state.error : null;

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

  return (
    <form
      noValidate
      action={formAction}
      onSubmit={onSubmit}
      onChange={(event) => {
        const target = event.target;
        if (
          (target instanceof HTMLInputElement ||
            target instanceof HTMLSelectElement ||
            target instanceof HTMLTextAreaElement) &&
          fields.some((f) => f.name === target.name)
        )
          onFieldChange?.(target.name, target.value);
      }}
      onBlur={(event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || !fields.some((f) => f.name === target.name))
          return;
        const parsed = schema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
        const issues = parsed.success ? {} : fieldErrors(parsed.error);
        setClientErrors((current) => ({
          ...state?.fields,
          ...current,
          [target.name]: issues[target.name],
        }));
      }}
      className="grid grid-cols-2 gap-x-3 gap-y-1"
    >
      <input type="hidden" name="locale" value={locale} />
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
        return (
          <Field key={f.name} className={f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}>
            <Label htmlFor={f.name}>{f.label}</Label>
            {f.kind === 'select' ? (
              <Select
                id={f.name}
                name={f.name}
                defaultValue={state?.values?.[f.name] ?? defaults?.[f.name]}
                aria-invalid={err ? true : undefined}
                aria-describedby={err ? errId : undefined}
              >
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            ) : f.kind === 'textarea' ? (
              <Textarea
                id={f.name}
                name={f.name}
                dir="auto"
                placeholder={f.placeholder}
                defaultValue={state?.values?.[f.name] ?? defaults?.[f.name]}
                aria-invalid={err ? true : undefined}
                aria-describedby={err ? errId : undefined}
              />
            ) : (
              <Input
                id={f.name}
                name={f.name}
                type={f.kind === 'number' || f.kind === 'decimal' ? 'text' : f.kind}
                autoComplete={f.autoComplete ?? 'off'}
                inputMode={
                  f.kind === 'email'
                    ? 'email'
                    : f.kind === 'number'
                      ? 'numeric'
                      : f.kind === 'decimal'
                        ? 'decimal'
                        : undefined
                }
                dir={
                  f.kind === 'email' ||
                  f.kind === 'number' ||
                  f.kind === 'time' ||
                  f.kind === 'date'
                    ? 'ltr'
                    : 'auto'
                }
                placeholder={f.placeholder}
                defaultValue={state?.values?.[f.name] ?? defaults?.[f.name]}
                aria-invalid={err ? true : undefined}
                aria-describedby={err ? errId : undefined}
              />
            )}
            <FieldError id={errId}>{err ? v(err) : null}</FieldError>
          </Field>
        );
      })}

      <div className="col-span-2 mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button type="submit" pending={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
