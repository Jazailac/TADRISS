import type { Child } from '@tadriss/shared';
import { Check, Users } from 'lucide-react';
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
      <div className="workspace-page w-full mx-auto grid grid-cols-1 max-w-3xl gap-7">
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
    <div className="parent-page grid grid-cols-1 gap-7">
      <div className="parent-child-context mx-auto w-full max-w-6xl">
        <div className="parent-current-child">
          <Avatar
            first={child.firstName}
            last={child.lastName}
            seed={child.id}
            className="size-10"
          />
          <div>
            <p>
              <bdi>{t('viewingChild', { name: `${child.firstName} ${child.lastName}` })}</bdi>
            </p>
            {child.className ? (
              <p className="parent-child-class" dir="auto">
                {child.className}
              </p>
            ) : null}
          </div>
        </div>
        {kids.length > 1 ? (
          <nav aria-label={t('switcher.label')} className="parent-child-switcher">
            <span className="parent-switcher-label">
              <Users className="size-4" aria-hidden />
              {t('switcher.label')}
            </span>
            {kids.map((k) => {
              const name = `${k.firstName} ${k.lastName}`;
              return (
                <Link
                  key={k.id}
                  href={{ pathname: path, query: { ...extraQuery, child: k.id } }}
                  aria-current={k.id === child.id ? 'page' : undefined}
                  className={cx('parent-child-link', k.id === child.id && 'parent-child-selected')}
                >
                  <bdi>{name}</bdi>
                  {k.id === child.id ? <Check className="size-4 shrink-0" aria-hidden /> : null}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>
      {render(child)}
    </div>
  );
}
