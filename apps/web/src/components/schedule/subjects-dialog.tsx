'use client';

import { subjectColors, type Subject } from '@tadriss/shared';
import { Archive, ArchiveRestore, BookMarked } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import {
  archiveSubjectAction,
  createSubjectAction,
  updateSubjectAction,
} from '@/app/actions/schedule';
import { ActionForm } from '../forms/action-form';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cx } from '../ui/cx';
import { Dialog } from '../ui/dialog';
import { useToast } from '../ui/toast';
import { subjectSwatch } from './colors';

/** Manage the school's subjects: add, rename/recolour, archive. */
export function SubjectsDialog({ subjects }: { subjects: Subject[] }) {
  const t = useTranslations('schedule');
  const c = useTranslations('common');
  const e = useTranslations('errors');
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [pending, start] = useTransition();
  // Remount the add form after each success so it comes back empty.
  const [round, setRound] = useState(0);

  const colorOptions = subjectColors.map((x) => ({ value: x, label: t(`subjects.colors.${x}`) }));
  const toggleArchive = (s: Subject) => {
    start(async () => {
      const res = await archiveSubjectAction(s.id, !s.archived);
      if (res.ok)
        toast.success(t(s.archived ? 'feedback.subjectRestored' : 'feedback.subjectArchived'));
      else toast.error(e(res.error));
    });
  };

  return (
    <>
      <Button
        variant="secondary"
        icon={<BookMarked className="size-4" aria-hidden />}
        onClick={() => {
          setOpen(true);
        }}
      >
        {t('actions.subjects')}
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        title={t('subjects.title')}
        description={t('subjects.description')}
        className="max-w-xl"
      >
        {subjects.length === 0 ? (
          <p className="rounded-lg bg-surface-muted p-4 text-sm text-text-muted">
            {t('subjects.empty')}
          </p>
        ) : (
          <ul
            aria-label={t('subjects.list')}
            className="max-h-60 divide-y divide-border overflow-y-auto rounded-lg border border-border"
          >
            {subjects.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                <span
                  aria-hidden
                  className={cx('size-3 shrink-0 rounded-full', subjectSwatch[s.color])}
                />
                <span
                  className={cx(
                    'min-w-0 flex-1 truncate text-sm font-medium',
                    s.archived && 'text-text-muted line-through',
                  )}
                >
                  <bdi>{s.name}</bdi>
                </span>
                {s.archived ? <Badge>{t('subjects.archived')}</Badge> : null}
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={t('subjects.editLabel', { name: s.name })}
                  onClick={() => {
                    setEditing(s);
                  }}
                >
                  {t('subjects.edit')}
                </Button>
                <button
                  type="button"
                  disabled={pending}
                  title={s.archived ? t('subjects.restore') : t('subjects.archive')}
                  aria-label={
                    s.archived
                      ? t('subjects.restoreLabel', { name: s.name })
                      : t('subjects.archiveLabel', { name: s.name })
                  }
                  onClick={() => {
                    toggleArchive(s);
                  }}
                  className="grid size-9 place-items-center rounded-lg text-text-muted hover:bg-surface-muted hover:text-text disabled:opacity-60"
                >
                  {s.archived ? (
                    <ArchiveRestore className="size-4" aria-hidden />
                  ) : (
                    <Archive className="size-4" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 border-t border-border pt-5">
          {editing ? (
            <ActionForm
              key={`edit-${editing.id}`}
              schema="updateSubject"
              action={updateSubjectAction}
              hidden={{ id: editing.id }}
              defaults={{ name: editing.name, color: editing.color }}
              fields={[
                { name: 'name', label: t('subjects.fields.name'), kind: 'text', half: true },
                {
                  name: 'color',
                  label: t('subjects.fields.color'),
                  kind: 'select',
                  options: colorOptions,
                  half: true,
                },
              ]}
              submitLabel={t('subjects.save')}
              cancelLabel={c('cancel')}
              onCancel={() => {
                setEditing(null);
              }}
              onDone={() => {
                setEditing(null);
                toast.success(t('feedback.subjectUpdated'));
              }}
            />
          ) : (
            <ActionForm
              key={`add-${round}`}
              schema="createSubject"
              action={createSubjectAction}
              defaults={{ color: 'primary' }}
              fields={[
                {
                  name: 'name',
                  label: t('subjects.fields.name'),
                  kind: 'text',
                  placeholder: t('subjects.placeholders.name'),
                  half: true,
                },
                {
                  name: 'color',
                  label: t('subjects.fields.color'),
                  kind: 'select',
                  options: colorOptions,
                  half: true,
                },
              ]}
              submitLabel={t('subjects.add')}
              cancelLabel={c('close')}
              onCancel={() => {
                setOpen(false);
              }}
              onDone={() => {
                setRound((r) => r + 1);
                toast.success(t('feedback.subjectCreated'));
              }}
            />
          )}
        </div>
      </Dialog>
    </>
  );
}
