import {
  currentSchoolYear,
  formatBytes,
  listClasses,
  listDocuments,
  type DocumentView,
} from '@tadriss/shared';
import {
  AlertCircle,
  Download,
  File as FileIcon,
  FileImage,
  FileSpreadsheet,
  FileText,
  Presentation,
} from 'lucide-react';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import type { Area } from '../communication/area';
import { Badge } from '../ui/badge';
import { ButtonLink, buttonStyles } from '../ui/button';
import { Card } from '../ui/card';
import { cx } from '../ui/cx';
import { EmptyState } from '../ui/empty-state';
import { ArchiveDocumentButton } from './archive-document-button';
import { EditDocumentButton, UploadDocumentButton } from './document-dialogs';

export type DocumentsParams = { view?: string };
type View = 'active' | 'deleted';

const n = (chunks: React.ReactNode) => <bdi>{chunks}</bdi>;

function Icon({ mime }: { mime: string }) {
  const cls = 'size-5';
  if (mime.startsWith('image/')) return <FileImage className={cls} aria-hidden />;
  if (mime.includes('sheet') || mime.includes('excel') || mime === 'text/csv')
    return <FileSpreadsheet className={cls} aria-hidden />;
  if (mime.includes('presentation') || mime.includes('powerpoint'))
    return <Presentation className={cls} aria-hidden />;
  if (mime === 'application/pdf' || mime.startsWith('text/') || mime.includes('word'))
    return <FileText className={cls} aria-hidden />;
  return <FileIcon className={cls} aria-hidden />;
}

export async function DocumentsPage({ area, params }: { area: Area; params: DocumentsParams }) {
  const viewer = await getViewer();
  const tz = viewer?.profile.institution?.timezone ?? 'Africa/Casablanca';
  const userId = viewer?.session.userId ?? '';
  const isAdmin = area === 'dashboard';
  const canPublish = area !== 'student';
  const view: View = params.view === 'deleted' && canPublish ? 'deleted' : 'active';
  const supabase = await getServerClient();

  const [t, shell, errors, f, locale, list, classes] = await Promise.all([
    getTranslations('documents'),
    getTranslations('shell.groups'),
    getTranslations('errors'),
    getFormatter(),
    getLocale(),
    listDocuments(supabase, { archived: view === 'deleted' }),
    canPublish ? listClasses(supabase, { schoolYear: currentSchoolYear() }) : null,
  ]);

  const head = (actions?: React.ReactNode) => (
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="eyebrow">{shell('communication')}</p>
        <h1 className="display mt-4 text-4xl md:text-5xl">{t('title')}</h1>
        <p className="mt-3 max-w-xl text-text-muted">{t(`subtitle.${isAdmin ? 'admin' : area}`)}</p>
      </div>
      {actions}
    </header>
  );

  if (!list.ok || (classes && !classes.ok)) {
    return (
      <div className="mx-auto grid grid-cols-1 max-w-4xl gap-7">
        {head()}
        <Card role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertCircle className="size-5" aria-hidden />
          </span>
          <h2 className="display text-2xl">{t('error.title')}</h2>
          <p className="max-w-md text-sm text-text-muted">{t('error.body')}</p>
          <ButtonLink href={`/${area}/documents`} variant="secondary" className="mt-2">
            {errors('retry')}
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const units = { b: t('size.b'), kb: t('size.kb'), mb: t('size.mb') };
  const number = new Intl.NumberFormat(locale);
  const tabs: View[] = ['active', 'deleted'];
  const emptyKey = view === 'deleted' ? 'deleted' : canPublish ? 'authored' : 'feed';

  return (
    <div className="mx-auto grid grid-cols-1 max-w-4xl gap-7">
      {head(
        canPublish ? (
          <UploadDocumentButton
            schoolWide={isAdmin}
            classes={(classes?.ok ? classes.data : []).map((c) => ({ id: c.id, name: c.name }))}
          />
        ) : undefined,
      )}

      {canPublish ? (
        <nav
          aria-label={t('views.label')}
          className="flex w-fit gap-1 rounded-lg bg-surface-muted p-1"
        >
          {tabs.map((v) => (
            <Link
              key={v}
              href={{ pathname: `/${area}/documents`, query: v === 'active' ? {} : { view: v } }}
              aria-current={view === v ? 'page' : undefined}
              className={cx(
                'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                view === v ? 'bg-surface text-text shadow-xs' : 'text-text-muted hover:text-text',
              )}
            >
              {t(`views.${v}`)}
            </Link>
          ))}
        </nav>
      ) : null}

      {list.data.length === 0 ? (
        <Card>
          <EmptyState
            title={t(`empty.${emptyKey}.title`)}
            description={t(`empty.${emptyKey}.body`)}
          />
        </Card>
      ) : (
        <ul aria-label={t('list')} className="grid grid-cols-1 gap-3">
          {list.data.map((d) => (
            <DocumentRow
              key={d.id}
              d={d}
              t={t}
              manage={isAdmin || d.uploaderId === userId}
              size={formatBytes(d.sizeBytes, units, number)}
              date={f.dateTime(new Date(d.createdAt), { dateStyle: 'medium', timeZone: tz })}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function DocumentRow({
  d,
  t,
  manage,
  size,
  date,
}: {
  d: DocumentView;
  t: Awaited<ReturnType<typeof getTranslations<'documents'>>>;
  manage: boolean;
  size: string;
  date: string;
}) {
  return (
    <li className="min-w-0 rounded-xl border border-border bg-surface p-4 shadow-sm sm:px-5">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
          <Icon mime={d.mimeType} />
        </span>
        <div className="min-w-0 flex-1 basis-56">
          <p className="font-medium" dir="auto">
            <bdi>{d.title}</bdi>
          </p>
          {d.description ? (
            <p className="mt-0.5 line-clamp-2 text-sm text-text-muted" dir="auto">
              {d.description}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-text-muted">
            <Badge>
              {d.audience === 'class'
                ? t.rich('audience.class', { name: d.className ?? '', n })
                : t(`audience.${d.audience}`)}
            </Badge>
            <span className="font-mono tabular-nums">{size}</span>
            <span className="font-mono tabular-nums">{date}</span>
            <span>{t.rich('by', { name: d.uploaderName, n })}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {d.archived ? null : (
            <a
              href={`/api/documents/${d.id}`}
              aria-label={t('actions.downloadNamed', { title: d.title })}
              className={buttonStyles({ variant: 'secondary', size: 'sm' })}
            >
              <Download className="size-4" aria-hidden />
              {t('actions.download')}
            </a>
          )}
          {manage ? (
            <>
              {d.archived ? null : <EditDocumentButton document={d} />}
              <ArchiveDocumentButton id={d.id} title={d.title} archived={d.archived} />
            </>
          ) : null}
        </div>
      </div>
    </li>
  );
}
