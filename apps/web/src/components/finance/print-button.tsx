'use client';

import { Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '../ui/button';

export function PrintButton() {
  const t = useTranslations('finance.actions');
  return (
    <Button
      icon={<Printer className="size-4" aria-hidden />}
      onClick={() => {
        window.print();
      }}
    >
      {t('print')}
    </Button>
  );
}
