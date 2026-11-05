'use client';

import type { Person } from '@tadriss/shared';
import { Pencil, UserCheck, UserX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { setMemberActive, updateMember } from '@/app/actions/people';
import { ActionForm } from '../forms/action-form';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Spinner } from '../ui/spinner';
import { useToast } from '../ui/toast';

const iconButton =
  'grid size-10 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-muted hover:text-text disabled:opacity-60';

/** Edit-name and activate/deactivate for one row. Deactivation asks for confirmation first. */
export function MemberActions({
  person,
}: {
  person: Pick<Person, 'id' | 'firstName' | 'lastName' | 'isActive'>;
}) {
  const t = useTranslations('people');
  const c = useTranslations('common');
  const e = useTranslations('errors');
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const name = `${person.firstName} ${person.lastName}`;

  const toggle = (active: boolean) => {
    start(async () => {
      const res = await setMemberActive(person.id, active);
      setConfirming(false);
      if (res.ok) toast.success(t(active ? 'feedback.activated' : 'feedback.deactivated'));
      else toast.error(e(res.error));
    });
  };

  return (
    <div className="flex items-center">
      <button
        type="button"
        className={iconButton}
        aria-label={t('actions.editLabel', { name })}
        title={t('actions.edit')}
        onClick={() => {
          setEditing(true);
        }}
      >
        <Pencil className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        className={iconButton}
        disabled={pending}
        aria-label={t(person.isActive ? 'actions.deactivateLabel' : 'actions.activateLabel', {
          name,
        })}
        title={t(person.isActive ? 'actions.deactivate' : 'actions.activate')}
        onClick={() => {
          if (person.isActive) setConfirming(true);
          else toggle(true);
        }}
      >
        {pending && !confirming ? (
          <Spinner label={false} />
        ) : person.isActive ? (
          <UserX className="size-4" aria-hidden />
        ) : (
          <UserCheck className="size-4" aria-hidden />
        )}
      </button>

      <Dialog
        open={editing}
        onClose={() => {
          setEditing(false);
        }}
        title={t('edit.title', { name })}
        description={t('edit.description')}
      >
        <ActionForm
          schema="updateMember"
          action={updateMember}
          hidden={{ id: person.id }}
          defaults={{ firstName: person.firstName, lastName: person.lastName }}
          fields={[
            { name: 'firstName', label: t('invite.fields.firstName'), kind: 'text', half: true },
            { name: 'lastName', label: t('invite.fields.lastName'), kind: 'text', half: true },
          ]}
          submitLabel={c('save')}
          cancelLabel={c('cancel')}
          onCancel={() => {
            setEditing(false);
          }}
          onDone={() => {
            setEditing(false);
            toast.success(t('feedback.saved'));
          }}
        />
      </Dialog>

      <Dialog
        open={confirming}
        onClose={() => {
          setConfirming(false);
        }}
        title={t('deactivate.title', { name })}
        description={t('deactivate.body')}
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="ghost"
            onClick={() => {
              setConfirming(false);
            }}
          >
            {c('cancel')}
          </Button>
          <Button
            variant="accent"
            pending={pending}
            onClick={() => {
              toggle(false);
            }}
          >
            {t('deactivate.confirm')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
