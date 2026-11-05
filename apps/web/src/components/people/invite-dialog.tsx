'use client';

import type { MemberRole } from '@tadriss/shared';
import { UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { inviteMember } from '@/app/actions/people';
import { ActionForm } from '../forms/action-form';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { useToast } from '../ui/toast';

export function InviteDialog({ role }: { role: MemberRole }) {
  const t = useTranslations('people');
  const c = useTranslations('common');
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
  };

  return (
    <>
      <Button
        icon={<UserPlus className="size-4" aria-hidden />}
        onClick={() => {
          setOpen(true);
        }}
      >
        {t(`actions.invite.${role}`)}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={t(`invite.title.${role}`)}
        description={t('invite.description')}
      >
        {/* Mounted only while open, so every opening starts from a clean form state. */}
        <ActionForm
          schema="invite"
          action={inviteMember}
          hidden={{ role }}
          fields={[
            {
              name: 'firstName',
              label: t('invite.fields.firstName'),
              kind: 'text',
              autoComplete: 'off',
              half: true,
            },
            {
              name: 'lastName',
              label: t('invite.fields.lastName'),
              kind: 'text',
              autoComplete: 'off',
              half: true,
            },
            {
              name: 'email',
              label: t('invite.fields.email'),
              kind: 'email',
              autoComplete: 'off',
              placeholder: t('invite.placeholders.email'),
            },
          ]}
          submitLabel={t('invite.submit')}
          cancelLabel={c('cancel')}
          onCancel={close}
          onDone={(values) => {
            close();
            toast.success(t('feedback.invited', { email: values.email ?? '' }));
          }}
        />
      </Dialog>
    </>
  );
}
