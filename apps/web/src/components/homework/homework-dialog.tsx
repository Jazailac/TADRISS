'use client';

import type { HomeworkView, Subject } from '@tadriss/shared';
import { Pencil, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { createHomeworkAction, updateHomeworkAction } from '@/app/actions/homework';
import { useRouter } from '@/i18n/navigation';
import { ActionForm } from '../forms/action-form';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { useToast } from '../ui/toast';

export type ClassOption = { id: string; name: string };

function subjectOptions(subjects: Subject[], keep?: string) {
  return subjects
    .filter((s) => !s.archived || s.id === keep)
    .map((s) => ({ value: s.id, label: s.name }));
}

export function NewHomeworkButton({
  classes,
  subjects,
  defaultDueDate,
}: {
  classes: ClassOption[];
  subjects: Subject[];
  defaultDueDate: string;
}) {
  const t = useTranslations('homework');
  const c = useTranslations('common');
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
  };
  const subjectOpts = subjectOptions(subjects);
  const blocked = classes.length === 0 || subjectOpts.length === 0;

  return (
    <>
      <Button
        icon={<Plus className="size-4" aria-hidden />}
        onClick={() => {
          setOpen(true);
        }}
      >
        {t('actions.new')}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={t('form.newTitle')}
        description={t('form.newDescription')}
        className="max-w-xl"
      >
        {blocked ? (
          <p className="rounded-lg bg-warning-soft p-4 text-sm text-warning">
            {classes.length === 0 ? t('form.noClasses') : t('form.noSubjects')}
          </p>
        ) : (
          <ActionForm
            schema="createHomework"
            action={createHomeworkAction}
            defaults={{ dueDate: defaultDueDate }}
            fields={[
              {
                name: 'classId',
                label: t('form.fields.class'),
                kind: 'select',
                options: classes.map((x) => ({ value: x.id, label: x.name })),
                half: true,
              },
              {
                name: 'subjectId',
                label: t('form.fields.subject'),
                kind: 'select',
                options: subjectOpts,
                half: true,
              },
              {
                name: 'title',
                label: t('form.fields.title'),
                kind: 'text',
                placeholder: t('form.placeholders.title'),
              },
              {
                name: 'description',
                label: t('form.fields.description'),
                kind: 'textarea',
                placeholder: t('form.placeholders.description'),
              },
              { name: 'dueDate', label: t('form.fields.dueDate'), kind: 'date', half: true },
            ]}
            submitLabel={t('form.create')}
            cancelLabel={c('cancel')}
            onCancel={close}
            onDone={(values) => {
              close();
              toast.success(t('feedback.created'));
              if (values.id) router.push(`/teacher/homework/${values.id}`);
            }}
          />
        )}
      </Dialog>
    </>
  );
}

export function EditHomeworkButton({
  homework,
  subjects,
}: {
  homework: HomeworkView;
  subjects: Subject[];
}) {
  const t = useTranslations('homework');
  const c = useTranslations('common');
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        icon={<Pencil className="size-4" aria-hidden />}
        onClick={() => {
          setOpen(true);
        }}
      >
        {t('actions.edit')}
      </Button>
      <Dialog open={open} onClose={close} title={t('form.editTitle')} className="max-w-xl">
        <ActionForm
          schema="updateHomework"
          action={updateHomeworkAction}
          hidden={{ id: homework.id }}
          defaults={{
            subjectId: homework.subjectId,
            title: homework.title,
            description: homework.description ?? '',
            dueDate: homework.dueDate,
          }}
          fields={[
            {
              name: 'subjectId',
              label: t('form.fields.subject'),
              kind: 'select',
              options: subjectOptions(subjects, homework.subjectId),
              half: true,
            },
            { name: 'dueDate', label: t('form.fields.dueDate'), kind: 'date', half: true },
            { name: 'title', label: t('form.fields.title'), kind: 'text' },
            { name: 'description', label: t('form.fields.description'), kind: 'textarea' },
          ]}
          submitLabel={c('save')}
          cancelLabel={c('cancel')}
          onCancel={close}
          onDone={() => {
            close();
            toast.success(t('feedback.updated'));
          }}
        />
      </Dialog>
    </>
  );
}
