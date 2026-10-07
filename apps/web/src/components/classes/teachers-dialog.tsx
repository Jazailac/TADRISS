'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { setTeachersAction } from '@/app/actions/classes';
import { Avatar } from '../ui/avatar';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { useToast } from '../ui/toast';

export type TeacherOption = { id: string; firstName: string; lastName: string };

/** Pick the teachers of a class from the school's active teachers. Saved atomically. */
export function TeachersDialog({
  classId,
  options,
  selected,
}: {
  classId: string;
  options: TeacherOption[];
  selected: string[];
}) {
  const t = useTranslations('classes');
  const c = useTranslations('common');
  const e = useTranslations('errors');
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [chosen, setChosen] = useState(() => new Set(selected));
  const close = () => {
    setOpen(false);
  };

  const toggle = (id: string) => {
    setChosen((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = () => {
    start(async () => {
      const res = await setTeachersAction(classId, [...chosen]);
      if (res.ok) {
        close();
        toast.success(t('feedback.teachersSaved'));
      } else toast.error(e(res.error));
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setChosen(new Set(selected));
          setOpen(true);
        }}
      >
        {t('teachers.manage')}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={t('teachers.dialogTitle')}
        description={t('teachers.dialogBody')}
      >
        {options.length === 0 ? (
          <p className="rounded-lg bg-surface-muted p-4 text-sm text-text-muted">
            {t('teachers.none')}
          </p>
        ) : (
          <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {options.map((o) => (
              <li key={o.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-surface-muted">
                  <input
                    type="checkbox"
                    checked={chosen.has(o.id)}
                    onChange={() => {
                      toggle(o.id);
                    }}
                    className="size-4 accent-primary"
                  />
                  <Avatar
                    first={o.firstName}
                    last={o.lastName}
                    seed={o.id}
                    className="size-8 text-xs"
                  />
                  <span className="min-w-0 truncate text-sm font-medium">
                    <bdi>
                      {o.firstName} {o.lastName}
                    </bdi>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={close}>
            {c('cancel')}
          </Button>
          <Button pending={pending} onClick={save}>
            {t('teachers.save')}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
