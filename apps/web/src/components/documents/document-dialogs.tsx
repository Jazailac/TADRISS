'use client';

import {
  audienceValue,
  documentAccept,
  documentInput,
  fieldErrors,
  validateDocumentFile,
  type DocumentView,
  type ValidationKey,
} from '@tadriss/shared';
import { Pencil, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition, type SubmitEvent } from 'react';
import { updateDocumentAction, uploadDocumentAction } from '@/app/actions/documents';
import { useRouter } from '@/i18n/navigation';
import { ActionForm } from '../forms/action-form';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Field, FieldError, Input, Label, Select, Textarea } from '../ui/field';
import { useToast } from '../ui/toast';

export type ClassOption = { id: string; name: string };

type Errors = Partial<Record<string, ValidationKey>>;

/**
 * Upload form. Not an `ActionForm`: React resets a form after its action, which would empty the
 * file picker when the server refuses something. Here the action is called directly and the form is
 * left alone, so the person fixes the one problem without choosing the file again.
 */
export function UploadDocumentButton({
  classes,
  schoolWide,
}: {
  classes: ClassOption[];
  schoolWide: boolean;
}) {
  const t = useTranslations('documents');
  const c = useTranslations('common');
  const v = useTranslations('validation');
  const e = useTranslations('errors');
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const close = () => {
    setOpen(false);
    setErrors({});
    setServerError(null);
  };

  const options = [
    ...(schoolWide
      ? (['all', 'teachers', 'students', 'parents'] as const).map((a) => ({
          value: a,
          label: t(`audience.${a}`),
        }))
      : []),
    ...classes.map((x) => ({
      value: audienceValue('class', x.id),
      label: t('audience.classOption', { name: x.name }),
    })),
  ];

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const file = fd.get('file');
    const parsed = documentInput.safeParse(Object.fromEntries(fd));
    const errs: Errors = parsed.success ? {} : fieldErrors(parsed.error);
    const fileProblem =
      file instanceof File && file.size > 0 ? validateDocumentFile(file) : 'fileRequired';
    if (fileProblem) errs.file = fileProblem;
    setErrors(errs);
    setServerError(null);
    const first = ['file', 'audience', 'title', 'description'].find((n) => errs[n]);
    if (first) {
      (form.elements.namedItem(first) as HTMLElement | null)?.focus();
      return;
    }
    start(async () => {
      const res = await uploadDocumentAction(null, fd);
      if (res?.done) {
        close();
        toast.success(t('feedback.uploaded'));
        router.refresh();
      } else if (res?.fields && Object.keys(res.fields).length > 0) setErrors(res.fields);
      else setServerError(res?.error ? e(res.error) : e('unknown'));
    });
  };

  return (
    <>
      <Button
        icon={<Upload className="size-4" aria-hidden />}
        onClick={() => {
          setOpen(true);
        }}
      >
        {t('actions.upload')}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={t('form.uploadTitle')}
        description={t('form.uploadDescription')}
        className="max-w-xl"
      >
        {options.length === 0 ? (
          <p className="rounded-lg bg-warning-soft p-4 text-sm text-warning">
            {t('form.noClasses')}
          </p>
        ) : (
          <form noValidate onSubmit={onSubmit} className="grid gap-x-3 gap-y-1">
            {serverError ? (
              <p role="alert" className="rounded-lg bg-danger-soft p-3.5 text-sm text-danger">
                {serverError}
              </p>
            ) : null}
            <Field>
              <Label htmlFor="doc-file">{t('form.fields.file')}</Label>
              <Input
                id="doc-file"
                name="file"
                type="file"
                accept={documentAccept}
                aria-invalid={errors.file ? true : undefined}
                aria-describedby={errors.file ? 'doc-file-error' : undefined}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  setErrors((cur) => ({
                    ...cur,
                    file: file ? (validateDocumentFile(file) ?? undefined) : undefined,
                  }));
                  // Offer the file name as the title, once, if the title is still empty.
                  const title = event.currentTarget.form?.elements.namedItem('title');
                  if (file && title instanceof HTMLInputElement && title.value === '')
                    title.value = file.name.replace(/\.[^.]+$/, '');
                }}
              />
              <FieldError id="doc-file-error">{errors.file ? v(errors.file) : null}</FieldError>
            </Field>
            <Field>
              <Label htmlFor="doc-audience">{t('form.fields.audience')}</Label>
              <Select
                id="doc-audience"
                name="audience"
                aria-invalid={errors.audience ? true : undefined}
              >
                {options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <FieldError id="doc-audience-error">
                {errors.audience ? v(errors.audience) : null}
              </FieldError>
            </Field>
            <Field>
              <Label htmlFor="doc-title">{t('form.fields.title')}</Label>
              <Input
                id="doc-title"
                name="title"
                dir="auto"
                autoComplete="off"
                placeholder={t('form.placeholders.title')}
                aria-invalid={errors.title ? true : undefined}
              />
              <FieldError id="doc-title-error">{errors.title ? v(errors.title) : null}</FieldError>
            </Field>
            <Field>
              <Label htmlFor="doc-description">{t('form.fields.description')}</Label>
              <Textarea
                id="doc-description"
                name="description"
                dir="auto"
                placeholder={t('form.placeholders.description')}
                aria-invalid={errors.description ? true : undefined}
              />
              <FieldError id="doc-description-error">
                {errors.description ? v(errors.description) : null}
              </FieldError>
            </Field>
            <p className="text-xs text-text-muted">{t('form.limits')}</p>
            <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={close}>
                {c('cancel')}
              </Button>
              <Button type="submit" pending={pending}>
                {t('form.upload')}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}

export function EditDocumentButton({ document }: { document: DocumentView }) {
  const t = useTranslations('documents');
  const c = useTranslations('common');
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        icon={<Pencil className="size-4" aria-hidden />}
        aria-label={t('actions.editNamed', { title: document.title })}
        onClick={() => {
          setOpen(true);
        }}
      >
        {t('actions.edit')}
      </Button>
      <Dialog open={open} onClose={close} title={t('form.editTitle')} className="max-w-xl">
        <ActionForm
          schema="updateDocument"
          action={updateDocumentAction}
          hidden={{ id: document.id }}
          defaults={{ title: document.title, description: document.description ?? '' }}
          fields={[
            { name: 'title', label: t('form.fields.title'), kind: 'text' },
            { name: 'description', label: t('form.fields.description'), kind: 'textarea' },
          ]}
          submitLabel={c('save')}
          cancelLabel={c('cancel')}
          onCancel={close}
          onDone={() => {
            close();
            toast.success(t('feedback.updated'));
            router.refresh();
          }}
        />
      </Dialog>
    </>
  );
}
