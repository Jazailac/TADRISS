import { listAuditLog } from '@tadriss/shared';
import { AlertCircle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { ButtonLink } from '../ui/button';
import { Card } from '../ui/card';
import { EmptyState } from '../ui/empty-state';
import { AuditList } from './audit-list';

const PAGE = 50;
export type AuditParams = { before?: string };

/** The platform-wide log, 50 at a time; `before` is the cursor of the last entry shown. */
export async function AuditPage({ params }: { params: AuditParams }) {
  const supabase = await getServerClient();
  const [t, p, errors, res] = await Promise.all([
    getTranslations('audit'),
    getTranslations('platform'),
    getTranslations('errors'),
    listAuditLog(supabase, { before: params.before, limit: PAGE + 1 }),
  ]);

  const head = (
    <header>
      <p className="eyebrow">{p('eyebrow')}</p>
      <h1 className="display mt-4 text-4xl md:text-5xl">{t('title')}</h1>
      <p className="mt-3 max-w-xl text-text-muted">{t('subtitle')}</p>
    </header>
  );

  if (!res.ok) {
    return (
      <div className="mx-auto grid grid-cols-1 max-w-4xl gap-7">
        {head}
        <Card role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertCircle className="size-5" aria-hidden />
          </span>
          <h2 className="display text-2xl">{p('error.title')}</h2>
          <p className="max-w-md text-sm text-text-muted">{p('error.body')}</p>
          <ButtonLink href="/admin/audit" variant="secondary" className="mt-2">
            {errors('retry')}
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const more = res.data.length > PAGE;
  const entries = res.data.slice(0, PAGE);
  const last = entries[entries.length - 1];

  return (
    <div className="mx-auto grid grid-cols-1 max-w-4xl gap-7">
      {head}
      <Card className="p-6">
        {entries.length === 0 ? (
          <EmptyState title={t('empty.title')} description={t('empty.body')} />
        ) : (
          <AuditList entries={entries} showSchool />
        )}
      </Card>
      {more && last ? (
        <Link
          href={{ pathname: '/admin/audit', query: { before: last.createdAt } }}
          className="w-fit rounded-md px-4 py-2 text-sm font-medium text-primary hover:bg-primary-soft"
        >
          {t('older')}
        </Link>
      ) : null}
    </div>
  );
}
