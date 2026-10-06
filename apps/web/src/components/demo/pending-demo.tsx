'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '../ui/button';

/** Demonstrates the pending state (a real action would await a server action here). */
export function PendingDemo() {
  const t = useTranslations('demo.kit');
  const [state, setState] = useState<'idle' | 'pending' | 'done'>('idle');
  return (
    <Button
      pending={state === 'pending'}
      icon={state === 'done' ? <Check className="size-4" aria-hidden /> : undefined}
      onClick={() => {
        setState('pending');
        window.setTimeout(() => {
          setState('done');
        }, 1200);
      }}
    >
      {state === 'done' ? t('saved') : t('save')}
    </Button>
  );
}
