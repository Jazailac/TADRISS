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
  const canPublish = area === 'dashboard' || area === 'teacher';
  const view: View = params.view === 'deleted' && canPublish ? 'deleted' : 'active';
  const supabase = await getServerClient();

  const [t, d, shell, errors, f, locale, list, classes] = await Promise.all([
    getTranslations('documents'),
    getTranslations('domain'),
    getTranslations('shell.groups'),
    getTranslations('errors'),
    getFormatter(),
    getLocale(),
    listDocuments(supabase, { archived: view === 'deleted' }),
    canPublish ? listClasses(supabase, { schoolYear: currentSchoolYear() }) : null,
  ]);

  const head = (actions?: React.ReactNode) => (
    <header className="workspace-header flex flex-wrap items-end justify-between gap-5">
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
      <div className="workspace-page w-full mx-auto grid grid-cols-1 max-w-6xl gap-7">
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
    <div className="workspace-page w-full mx-auto grid grid-cols-1 max-w-6xl gap-7">
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
          className="workspace-tabs flex max-w-full w-fit flex-wrap gap-1 rounded-lg border border-border bg-surface-muted/60 p-1"
        >
          {tabs.map((v) => (
            <Link
              key={v}
              href={{ pathname: `/${area}/documents`, query: v === 'active' ? {} : { view: v } }}
              aria-current={view === v ? 'page' : undefined}
              className={cx(
                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                view === v ? 'bg-surface text-text shadow-xs' : 'text-text-muted hover:text-text',
              )}
            >
              {t(`views.${v}`)}
            </Link>
          ))}
        </nav>
      ) : null}

      <div className="library-masthead">
        <h2>{d('library')}</h2>
        <p>
          {d('files', { count: list.data.length })} ·{' '}
          {formatBytes(
            list.data.reduce((sum, doc) => sum + doc.sizeBytes, 0),
            units,
            number,
          )}
        </p>
      </div>

      {list.data.length === 0 ? (
        <Card>
          <EmptyState
            title={t(`empty.${emptyKey}.title`)}
            description={t(`empty.${emptyKey}.body`)}
          />
        </Card>
      ) : (
        <ul aria-label={t('list')} className="document-library">
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
  const kind = d.mimeType.startsWith('image/')
    ? 'image'
    : d.mimeType.includes('sheet') || d.mimeType.includes('excel') || d.mimeType === 'text/csv'
      ? 'sheet'
      : d.mimeType.includes('presentation') || d.mimeType.includes('powerpoint')
        ? 'presentation'
        : 'document';
  const extension = d.fileName.includes('.')
    ? d.fileName.split('.').pop()?.toLocaleUpperCase()
    : d.mimeType.split('/')[1]?.toLocaleUpperCase();
  return (
    <li className="library-file">
      <div className="library-cover" data-kind={kind} aria-hidden>
        <Icon mime={d.mimeType} />
        <span className="library-format">
          <bdi>{extension}</bdi>
        </span>
      </div>
      <div className="library-file-body">
        <Badge className="w-fit">
          {d.audience === 'class'
            ? t.rich('audience.class', { name: d.className ?? '', n })
            : t(`audience.${d.audience}`)}
        </Badge>
        <h3 dir="auto">
          <bdi>{d.title}</bdi>
        </h3>
        {d.description ? (
          <p className="line-clamp-3" dir="auto">
            {d.description}
          </p>
        ) : null}
        <p className="truncate font-mono text-xs" dir="auto">
          <bdi>{d.fileName}</bdi>
        </p>
        <div className="library-file-meta">
          <span className="font-mono tabular-nums">{size}</span>
          <span className="font-mono tabular-nums">{date}</span>
          <span className="basis-full">{t.rich('by', { name: d.uploaderName, n })}</span>
        </div>
      </div>
      <div className="library-file-actions">
        {d.archived ? null : (
          <a
            href={`/api/documents/${d.id}`}
            aria-label={t('actions.downloadNamed', { title: d.title })}
            className={buttonStyles({ variant: 'ghost', size: 'sm' })}
          >
            <Download className="size-4" aria-hidden />
            {t('actions.download')}
          </a>
        )}
        {manage ? (
          <div>
            {d.archived ? null : <EditDocumentButton document={d} />}
            <ArchiveDocumentButton id={d.id} title={d.title} archived={d.archived} />
          </div>
        ) : null}
      </div>
    </li>
  );
}
