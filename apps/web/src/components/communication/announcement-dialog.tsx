'use client';

import { audienceValue, type AnnouncementView } from '@tadriss/shared';
import { Pencil, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { createAnnouncementAction, updateAnnouncementAction } from '@/app/actions/announcements';
import { useRouter } from '@/i18n/navigation';
import { ActionForm } from '../forms/action-form';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { useToast } from '../ui/toast';
import type { Area } from './area';

export type ClassOption = { id: string; name: string };

export function NewAnnouncementButton({
  area,
  classes,
  schoolWide,
}: {
  area: Area;
  classes: ClassOption[];
  /** The administration may also address the whole school or a role. */
  schoolWide: boolean;
}) {
  const t = useTranslations('announcements');
  const c = useTranslations('common');
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
  };

  const options = [
    ...(schoolWide
      ? (['all', 'teachers', 'students'] as const).map((a) => ({
          value: a,
          label: t(`audience.${a}`),
        }))
      : []),
    ...classes.map((x) => ({
      value: audienceValue('class', x.id),
      label: t('audience.classOption', { name: x.name }),
    })),
  ];

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
        {options.length === 0 ? (
          <p className="rounded-lg bg-warning-soft p-4 text-sm text-warning">
            {t('form.noClasses')}
          </p>
        ) : (
          <ActionForm
            schema="createAnnouncement"
            action={createAnnouncementAction}
            fields={[
              {
                name: 'audience',
                label: t('form.fields.audience'),
                kind: 'select',
                options,
              },
              {
                name: 'title',
                label: t('form.fields.title'),
                kind: 'text',
                placeholder: t('form.placeholders.title'),
              },
              {
                name: 'body',
                label: t('form.fields.body'),
                kind: 'textarea',
                placeholder: t('form.placeholders.body'),
              },
            ]}
            submitLabel={t('form.create')}
            cancelLabel={c('cancel')}
            onCancel={close}
            onDone={(values) => {
              close();
              toast.success(t('feedback.created'));
              if (values.id) router.push(`/${area}/announcements/${values.id}`);
            }}
          />
        )}
      </Dialog>
    </>
  );
}

export function EditAnnouncementButton({ announcement }: { announcement: AnnouncementView }) {
  const t = useTranslations('announcements');
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
          schema="updateAnnouncement"
          action={updateAnnouncementAction}
          hidden={{ id: announcement.id }}
          defaults={{ title: announcement.title, body: announcement.body }}
          fields={[
            { name: 'title', label: t('form.fields.title'), kind: 'text' },
            { name: 'body', label: t('form.fields.body'), kind: 'textarea' },
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
