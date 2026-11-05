'use client';

import { plans, type Plan } from '@tadriss/shared';
import { PauseCircle, PlayCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { setPlanAction, setSuspendedAction } from '@/app/actions/platform';
import { useRouter } from '@/i18n/navigation';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Label, Select } from '../ui/field';
import { useToast } from '../ui/toast';

export function PlanSelect({ id, plan }: { id: string; plan: Plan }) {
  const t = useTranslations('platform');
  const s = useTranslations('settings.plan.names');
  const e = useTranslations('errors');
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState<Plan>(plan);

  return (
    <div className="grid gap-1.5">
      <Label htmlFor="plan-select">{t('detail.plan')}</Label>
      <Select
        id="plan-select"
        value={value}
        disabled={pending}
        aria-busy={pending || undefined}
        onChange={(event) => {
          const next = event.target.value as Plan;
          const previous = value;
          setValue(next);
          start(async () => {
            const res = await setPlanAction(id, next);
            if (res.ok) {
              toast.success(t('feedback.planChanged', { plan: s(next) }));
              router.refresh();
            } else {
              setValue(previous);
              toast.error(e(res.error));
            }
          });
        }}
      >
        {plans.map((p) => (
          <option key={p} value={p}>
            {s(p)}
          </option>
        ))}
      </Select>
    </div>
  );
}

export function SuspendButton({ id, suspended }: { id: string; suspended: boolean }) {
  const t = useTranslations('platform');
  const c = useTranslations('common');
  const e = useTranslations('errors');
  const toast = useToast();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const close = () => {
    setConfirming(false);
  };

  const run = () => {
    start(async () => {
      const res = await setSuspendedAction(id, !suspended);
      close();
      if (res.ok) {
        toast.success(t(suspended ? 'feedback.restored' : 'feedback.suspended'));
        router.refresh();
      } else toast.error(e(res.error));
    });
  };

  if (suspended) {
    return (
      <Button
        variant="secondary"
        pending={pending}
        icon={<PlayCircle className="size-4" aria-hidden />}
        onClick={run}
      >
        {t('detail.restore')}
      </Button>
    );
  }
  return (
    <>
      <Button
        variant="ghost"
        icon={<PauseCircle className="size-4" aria-hidden />}
        onClick={() => {
          setConfirming(true);
        }}
      >
        {t('detail.suspend')}
      </Button>
      <Dialog
        open={confirming}
        onClose={close}
        title={t('suspend.title')}
        description={t('suspend.body')}
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={close}>
            {c('cancel')}
          </Button>
          <Button variant="accent" pending={pending} onClick={run}>
            {t('suspend.confirm')}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
