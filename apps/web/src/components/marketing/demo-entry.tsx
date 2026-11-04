'use client';

import { ArrowRight } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { Button } from '../ui/button';

export function DemoEntry({ label, featured = false }: { label: string; featured?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={featured ? 'ink' : 'ghost'}
      className={featured ? 'w-fit gap-5' : 'w-fit gap-5 px-0 text-primary hover:bg-transparent'}
      pending={pending}
    >
      {label}
      {!pending ? <ArrowRight className="rtl-flip size-4" aria-hidden /> : null}
    </Button>
  );
}
