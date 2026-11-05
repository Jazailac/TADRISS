import { BookOpen } from 'lucide-react';
import type { ReactNode } from 'react';
export function EmptyState({
  title,
  description,
  action,
  heading: Heading = 'h2',
}: {
  title: string;
  description: string;
  action?: ReactNode;
  heading?: 'h1' | 'h2';
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="empty-architecture" aria-hidden>
        <BookOpen className="size-6 text-primary" />
      </span>
      <Heading className="display mt-6 text-2xl">{title}</Heading>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-text-muted">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
