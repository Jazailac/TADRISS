'use client';

import { schoolYearOptions } from '@tadriss/shared';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { createClassAction } from '@/app/actions/classes';
import { useRouter } from '@/i18n/navigation';
import { ActionForm } from '../forms/action-form';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { useToast } from '../ui/toast';

export function NewClassDialog({ defaultYear }: { defaultYear: string }) {
  const t = useTranslations('classes');
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
        icon={<Plus className="size-4" aria-hidden />}
        onClick={() => {
          setOpen(true);
        }}
      >
        {t('actions.new')}
      </Button>
      <Dialog open={open} onClose={close} title={t('new.title')} description={t('new.description')}>
        <ActionForm
          schema="createClass"
          action={createClassAction}
          defaults={{ schoolYear: defaultYear }}
          fields={[
            {
              name: 'name',
              label: t('new.fields.name'),
              kind: 'text',
              placeholder: t('new.placeholders.name'),
              half: true,
            },
            {
              name: 'level',
              label: t('new.fields.level'),
              kind: 'text',
              placeholder: t('new.placeholders.level'),
              half: true,
            },
            {
              name: 'schoolYear',
              label: t('new.fields.schoolYear'),
              kind: 'select',
              options: schoolYearOptions().map((y) => ({ value: y, label: y })),
              half: true,
            },
            {
              name: 'capacity',
              label: t('new.fields.capacity'),
              kind: 'number',
              placeholder: t('new.placeholders.capacity'),
              half: true,
            },
          ]}
          submitLabel={t('new.submit')}
          cancelLabel={c('cancel')}
          onCancel={close}
          onDone={(values) => {
            close();
            toast.success(t('feedback.created'));
            if (values.id) router.push(`/dashboard/classes/${values.id}`);
          }}
        />
      </Dialog>
    </>
  );
}
