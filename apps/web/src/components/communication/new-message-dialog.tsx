'use client';

import type { Contact } from '@tadriss/shared';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { sendMessageAction } from '@/app/actions/messages';
import { useRouter } from '@/i18n/navigation';
import { ActionForm } from '../forms/action-form';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { useToast } from '../ui/toast';
import type { Area } from './area';

export function NewMessageButton({ area, contacts }: { area: Area; contacts: Contact[] }) {
  const t = useTranslations('messages');
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
      <Dialog
        open={open}
        onClose={close}
        title={t('new.title')}
        description={t('new.description')}
        className="max-w-xl"
      >
        {contacts.length === 0 ? (
          <p className="rounded-lg bg-warning-soft p-4 text-sm text-warning">
            {t('new.noContacts')}
          </p>
        ) : (
          <ActionForm
            schema="sendMessage"
            action={sendMessageAction}
            fields={[
              {
                name: 'recipientId',
                label: t('new.fields.recipient'),
                kind: 'select',
                options: contacts.map((p) => ({
                  value: p.id,
                  label: `${p.firstName} ${p.lastName} · ${t(`roles.${p.role}`)}`,
                })),
              },
              {
                name: 'body',
                label: t('new.fields.body'),
                kind: 'textarea',
                placeholder: t('new.placeholders.body'),
              },
            ]}
            submitLabel={t('new.send')}
            cancelLabel={c('cancel')}
            onCancel={close}
            onDone={(values) => {
              close();
              toast.success(t('feedback.sent'));
              if (values.recipientId) router.push(`/${area}/messages/${values.recipientId}`);
            }}
          />
        )}
      </Dialog>
    </>
  );
}
