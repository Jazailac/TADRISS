'use client';

import { minutesToTime, weekdays, type SlotView, type Subject } from '@tadriss/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition, type ReactNode } from 'react';
import { createSlotAction, deleteSlotAction, updateSlotAction } from '@/app/actions/schedule';
import { ActionForm } from '../forms/action-form';
import { Button } from '../ui/button';
import { cx } from '../ui/cx';
import { Dialog } from '../ui/dialog';
import { useToast } from '../ui/toast';

export type TeacherOption = { id: string; name: string };

type Common = {
  classId: string;
  subjects: Subject[];
  teachers: TeacherOption[];
  /** Localised weekday names, Monday first (index 0 = weekday 1). */
  weekdayNames: string[];
};

function LessonDialog({
  open,
  onClose,
  slot,
  classId,
  subjects,
  teachers,
  weekdayNames,
}: Common & { open: boolean; onClose: () => void; slot?: SlotView }) {
  const t = useTranslations('schedule');
  const c = useTranslations('common');
  const e = useTranslations('errors');
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  const subjectOptions = subjects
    .filter((s) => !s.archived || s.id === slot?.subjectId)
    .map((s) => ({ value: s.id, label: s.name }));
  const teacherOptions = teachers.map((x) => ({ value: x.id, label: x.name }));
  const dayOptions = weekdays.map((d) => ({ value: String(d), label: weekdayNames[d - 1] ?? '' }));
  const blocked = subjectOptions.length === 0 || teacherOptions.length === 0;

  const remove = () => {
    if (!slot) return;
    start(async () => {
      const res = await deleteSlotAction(slot.id);
      if (res.ok) {
        onClose();
        toast.success(t('feedback.deleted'));
      } else toast.error(e(res.error));
    });
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        setConfirming(false);
        onClose();
      }}
      title={slot ? t('lesson.editTitle') : t('lesson.newTitle')}
      description={t('lesson.description')}
    >
      {blocked ? (
        <p className="rounded-lg bg-warning-soft p-4 text-sm text-warning">
          {teacherOptions.length === 0 ? t('lesson.noTeachers') : t('lesson.noSubjects')}
        </p>
      ) : (
        <ActionForm
          schema={slot ? 'updateSlot' : 'createSlot'}
          action={slot ? updateSlotAction : createSlotAction}
          hidden={slot ? { id: slot.id } : { classId }}
          defaults={
            slot
              ? {
                  subjectId: slot.subjectId,
                  teacherId: slot.teacherId,
                  weekday: String(slot.weekday),
                  start: minutesToTime(slot.startMin),
                  end: minutesToTime(slot.endMin),
                  room: slot.room ?? '',
                }
              : { weekday: '1', start: '08:30', end: '09:30' }
          }
          fields={[
            {
              name: 'subjectId',
              label: t('lesson.fields.subject'),
              kind: 'select',
              options: subjectOptions,
              half: true,
            },
            {
              name: 'teacherId',
              label: t('lesson.fields.teacher'),
              kind: 'select',
              options: teacherOptions,
              half: true,
            },
            {
              name: 'weekday',
              label: t('lesson.fields.weekday'),
              kind: 'select',
              options: dayOptions,
            },
            { name: 'start', label: t('lesson.fields.start'), kind: 'time', half: true },
            { name: 'end', label: t('lesson.fields.end'), kind: 'time', half: true },
            {
              name: 'room',
              label: t('lesson.fields.room'),
              kind: 'text',
              placeholder: t('lesson.placeholders.room'),
            },
          ]}
          submitLabel={slot ? c('save') : t('lesson.create')}
          cancelLabel={c('cancel')}
          onCancel={onClose}
          onDone={() => {
            onClose();
            toast.success(t(slot ? 'feedback.updated' : 'feedback.created'));
          }}
        />
      )}

      {slot ? (
        <div className="mt-5 border-t border-border pt-4">
          {confirming ? (
            <div role="alert" className="rounded-lg bg-danger-soft p-4">
              <p className="font-medium text-danger">{t('lesson.deleteConfirm')}</p>
              <p className="mt-1 text-sm text-danger">{t('lesson.deleteBody')}</p>
              <div className="mt-3 flex gap-2">
                <Button variant="accent" size="sm" pending={pending} onClick={remove}>
                  {t('lesson.delete')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setConfirming(false);
                  }}
                >
                  {c('cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 className="size-4" aria-hidden />}
              onClick={() => {
                setConfirming(true);
              }}
            >
              {t('lesson.delete')}
            </Button>
          )}
        </div>
      ) : null}
    </Dialog>
  );
}

export function AddLessonButton(props: Common & { disabled?: boolean }) {
  const t = useTranslations('schedule');
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        icon={<Plus className="size-4" aria-hidden />}
        disabled={props.disabled}
        onClick={() => {
          setOpen(true);
        }}
      >
        {t('actions.add')}
      </Button>
      <LessonDialog
        {...props}
        open={open}
        onClose={() => {
          setOpen(false);
        }}
      />
    </>
  );
}

/** Wraps a rendered lesson block so clicking it opens the edit dialog. */
export function LessonBlockButton({
  slot,
  label,
  className,
  children,
  ...common
}: Common & { slot: SlotView; label: string; className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={() => {
          setOpen(true);
        }}
        className={cx(
          'block h-full w-full text-start transition-shadow hover:shadow-md',
          className,
        )}
      >
        {children}
      </button>
      <LessonDialog
        {...common}
        slot={slot}
        open={open}
        onClose={() => {
          setOpen(false);
        }}
      />
    </>
  );
}
