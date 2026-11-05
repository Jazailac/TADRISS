'use client';

import { timezones, type InstitutionSettings } from '@tadriss/shared';
import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { updateSettingsAction } from '@/app/actions/settings';
import { useRouter } from '@/i18n/navigation';
import { ActionForm } from '../forms/action-form';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { useToast } from '../ui/toast';

export function EditSchoolButton({ settings }: { settings: InstitutionSettings }) {
  const t = useTranslations('settings');
  const l = useTranslations('locale');
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
        {t('profile.edit')}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={t('profile.editTitle')}
        description={t('profile.editDescription')}
        className="max-w-xl"
      >
        <ActionForm
          schema="updateSettings"
          action={updateSettingsAction}
          defaults={{
            name: settings.name,
            defaultLocale: settings.defaultLocale,
            timezone: settings.timezone,
            phone: settings.phone ?? '',
            address: settings.address ?? '',
            city: settings.city ?? '',
          }}
          fields={[
            { name: 'name', label: t('profile.fields.name'), kind: 'text' },
            {
              name: 'defaultLocale',
              label: t('profile.fields.defaultLocale'),
              kind: 'select',
              options: (['fr', 'ar', 'en'] as const).map((v) => ({ value: v, label: l(v) })),
              half: true,
            },
            {
              name: 'timezone',
              label: t('profile.fields.timezone'),
              kind: 'select',
              options: timezones.map((z) => ({ value: z, label: z.replace('_', ' ') })),
              half: true,
            },
            { name: 'phone', label: t('profile.fields.phone'), kind: 'text', half: true },
            { name: 'city', label: t('profile.fields.city'), kind: 'text', half: true },
            { name: 'address', label: t('profile.fields.address'), kind: 'text' },
          ]}
          submitLabel={c('save')}
          cancelLabel={c('cancel')}
          onCancel={close}
          onDone={() => {
            close();
            toast.success(t('feedback.saved'));
            router.refresh();
          }}
        />
      </Dialog>
    </>
  );
}
