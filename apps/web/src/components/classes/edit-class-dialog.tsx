'use client';

import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { updateClassAction } from '@/app/actions/classes';
import { ActionForm } from '../forms/action-form';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { useToast } from '../ui/toast';

export function EditClassDialog({
  id,
  name,
  level,
  capacity,
}: {
  id: string;
  name: string;
  level: string | null;
  capacity: number | null;
}) {
  const t = useTranslations('classes');
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
        {t('edit.button')}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={t('edit.title')}
        description={t('edit.yearLocked')}
      >
        <ActionForm
          schema="updateClass"
          action={updateClassAction}
          hidden={{ id }}
          defaults={{
            name,
            level: level ?? '',
            capacity: capacity === null ? '' : String(capacity),
          }}
          fields={[
            { name: 'name', label: t('new.fields.name'), kind: 'text', half: true },
            { name: 'level', label: t('new.fields.level'), kind: 'text', half: true },
            { name: 'capacity', label: t('new.fields.capacity'), kind: 'number' },
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
