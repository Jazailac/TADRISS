import type { Child } from '@tadriss/shared';
import { Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { getChildren, pickChild } from '@/lib/children';
import { Avatar } from '../ui/avatar';
import { Card } from '../ui/card';
import { cx } from '../ui/cx';
import { EmptyState } from '../ui/empty-state';

/**
 * Wraps a parent page: picks the child from `?child=`, shows a switcher when there are several, and
 * renders `children(child)`. A parent with no linked child gets an explanation instead of an empty
 * page.
 */
export async function WithChild({
  path,
  childParam,
  extraQuery = {},
  render,
}: {
  /** The page's own path, for the switcher links (e.g. `/parent/grades`). */
  path: string;
  childParam?: string;
  extraQuery?: Record<string, string>;
  render: (child: Child) => ReactNode;
}) {
  const [t, kids] = await Promise.all([getTranslations('parent'), getChildren()]);
  const child = pickChild(kids, childParam);

  if (!child) {
    return (
      <div className="mx-auto grid grid-cols-1 max-w-3xl gap-7">
        <Card>
          <EmptyState
            heading="h1"
            title={t('noChildren.title')}
            description={t('noChildren.body')}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-7">
      {kids.length > 1 ? (
        <nav
          aria-label={t('switcher.label')}
          className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2"
        >
          <Users className="size-4 text-text-muted" aria-hidden />
          {kids.map((k) => (
            <Link
              key={k.id}
              href={{ pathname: path, query: { ...extraQuery, child: k.id } }}
              aria-current={k.id === child.id ? 'page' : undefined}
              className={cx(
                'inline-flex items-center gap-2 rounded-full py-1 ps-1 pe-3 text-sm font-medium transition-colors',
                k.id === child.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-surface-muted text-text hover:bg-border',
              )}
            >
              <Avatar
                first={k.firstName}
                last={k.lastName}
                seed={k.id}
                className="size-7 text-[0.65rem]"
              />
              <bdi>{k.firstName}</bdi>
            </Link>
          ))}
        </nav>
      ) : null}
      <p className="sr-only">{t('viewingChild', { name: `${child.firstName} ${child.lastName}` })}</p>
      {render(child)}
    </div>
  );
}
