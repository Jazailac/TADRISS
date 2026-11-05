'use client';

import type { ExamView, Subject } from '@tadriss/shared';
import { Pencil, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { createExamAction, updateExamAction } from '@/app/actions/grades';
import { useRouter } from '@/i18n/navigation';
import { ActionForm } from '../forms/action-form';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { useToast } from '../ui/toast';

export type ClassOption = { id: string; name: string };

const subjectOptions = (subjects: Subject[], keep?: string) =>
  subjects.filter((s) => !s.archived || s.id === keep).map((s) => ({ value: s.id, label: s.name }));

/** Decimal for a form field: `1.5` as typed in the locale's own style is accepted by the schema. */
const asField = (n: number) => String(n);

export function NewExamButton({
  classes,
  subjects,
  defaultDate,
}: {
  classes: ClassOption[];
  subjects: Subject[];
  defaultDate: string;
}) {
  const t = useTranslations('grades');
  const c = useTranslations('common');
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
  };
  const subjectOpts = subjectOptions(subjects);
  const blocked = classes.length === 0 || subjectOpts.length === 0;
  const termOptions = [1, 2].map((n) => ({
    value: String(n),
    label: t(`terms.${n === 1 ? '1' : '2'}`),
  }));

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
            schema="createExam"
            action={createExamAction}
            defaults={{ examDate: defaultDate, maxScore: '20', coefficient: '1', term: '1' }}
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
              { name: 'examDate', label: t('form.fields.date'), kind: 'date', half: true },
              {
                name: 'term',
                label: t('form.fields.term'),
                kind: 'select',
                options: termOptions,
                half: true,
              },
              { name: 'maxScore', label: t('form.fields.maxScore'), kind: 'decimal', half: true },
              {
                name: 'coefficient',
                label: t('form.fields.coefficient'),
                kind: 'decimal',
                half: true,
              },
            ]}
            submitLabel={t('form.create')}
            cancelLabel={c('cancel')}
            onCancel={close}
            onDone={(values) => {
              close();
              toast.success(t('feedback.created'));
              if (values.id) router.push(`/teacher/grades/${values.id}`);
            }}
          />
        )}
      </Dialog>
    </>
  );
}

export function EditExamButton({ exam, subjects }: { exam: ExamView; subjects: Subject[] }) {
  const t = useTranslations('grades');
  const c = useTranslations('common');
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
  };
  const termOptions = [1, 2].map((n) => ({
    value: String(n),
    label: t(`terms.${n === 1 ? '1' : '2'}`),
  }));

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
          schema="updateExam"
          action={updateExamAction}
          hidden={{ id: exam.id }}
          defaults={{
            subjectId: exam.subjectId,
            title: exam.title,
            examDate: exam.examDate,
            term: String(exam.term),
            maxScore: asField(exam.maxScore),
            coefficient: asField(exam.coefficient),
          }}
          fields={[
            {
              name: 'subjectId',
              label: t('form.fields.subject'),
              kind: 'select',
              options: subjectOptions(subjects, exam.subjectId),
              half: true,
            },
            {
              name: 'term',
              label: t('form.fields.term'),
              kind: 'select',
              options: termOptions,
              half: true,
            },
            { name: 'title', label: t('form.fields.title'), kind: 'text' },
            { name: 'examDate', label: t('form.fields.date'), kind: 'date', half: true },
            { name: 'maxScore', label: t('form.fields.maxScore'), kind: 'decimal', half: true },
            {
              name: 'coefficient',
              label: t('form.fields.coefficient'),
              kind: 'decimal',
              half: true,
            },
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
