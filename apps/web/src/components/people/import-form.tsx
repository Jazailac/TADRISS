'use client';

import { maxImportRows, parseMembersCsv, type ImportParse } from '@tadriss/shared';
import { Upload } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState, useTransition } from 'react';
import { importMembersAction, type ImportOutcome } from '@/app/actions/people';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

const example =
  'prénom;nom;email;rôle\nSara;Alami;sara.alami@exemple.ma;élève\nOmar;Idrissi;omar@exemple.ma;parent\n';

export function ImportForm() {
  const t = useTranslations('import');
  const errors = useTranslations('errors');
  const locale = useLocale();
  const [text, setText] = useState('');
  const [pending, start] = useTransition();
  const [outcomes, setOutcomes] = useState<ImportOutcome[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const parsed: ImportParse | null = useMemo(
    () => (text.trim() === '' ? null : parseMembersCsv(text)),
    [text],
  );
  const usable = parsed?.ok ? parsed.rows.filter((r) => r.result.ok).length : 0;

  const send = () => {
    setFailed(null);
    start(async () => {
      const res = await importMembersAction(
        text,
        locale === 'ar' || locale === 'en' ? locale : 'fr',
      );
      if (res.ok) setOutcomes(res.data);
      else setFailed(res.error);
    });
  };

  return (
    <div className="grid grid-cols-1 gap-5">
      <Card className="grid gap-4 p-5 sm:p-6">
        <p className="text-sm text-text-muted">{t('format', { max: maxImportRows })}</p>
        <pre className="overflow-x-auto rounded-lg bg-surface-muted p-3 text-xs" dir="ltr">
          {example}
        </pre>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary-soft px-4 py-2 text-sm font-medium text-primary hover:bg-primary-soft/70">
            <Upload className="size-4" aria-hidden />
            {t('choose')}
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setOutcomes(null);
                void file.text().then(setText);
              }}
            />
          </label>
        </div>
        <label htmlFor="import-text" className="text-sm font-medium">
          {t('paste')}
        </label>
        <textarea
          id="import-text"
          value={text}
          dir="ltr"
          rows={6}
          onChange={(e) => {
            setOutcomes(null);
            setText(e.target.value);
          }}
          className="w-full rounded-md border border-border-strong bg-surface p-3 font-mono text-xs"
        />
      </Card>

      {parsed && !parsed.ok ? (
        <p role="alert" className="rounded-lg bg-danger-soft p-4 text-sm text-danger">
          {t(`parseError.${parsed.error}`, { max: maxImportRows })}
        </p>
      ) : null}

      {parsed?.ok && !outcomes ? (
        <Card className="grid gap-4 p-5 sm:p-6">
          <h2 className="font-semibold">
            {t('preview', { ready: usable, total: parsed.rows.length })}
          </h2>
          <ul aria-label={t('previewList')} className="grid divide-y divide-border">
            {parsed.rows.map((r) => (
              <li key={r.line} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                <span className="font-mono text-xs text-text-muted tabular-nums">{r.line}</span>
                <span className="min-w-0 flex-1 truncate">
                  <bdi>{`${r.values.firstName} ${r.values.lastName}`.trim() || '—'}</bdi>{' '}
                  <bdi className="text-text-muted">{r.values.email}</bdi>
                </span>
                {r.result.ok ? (
                  <Badge tone="success">{t(`role.${r.result.data.role}`)}</Badge>
                ) : (
                  <Badge tone="danger">{t(`rowError.${r.result.error}`)}</Badge>
                )}
              </li>
            ))}
          </ul>
          {failed ? (
            <p role="alert" className="text-sm text-danger">
              {errors(failed as 'unknown')}
            </p>
          ) : null}
          <div>
            <Button onClick={send} pending={pending} disabled={usable === 0}>
              {t('send', { count: usable })}
            </Button>
          </div>
        </Card>
      ) : null}

      {outcomes ? (
        <Card className="grid gap-3 p-5 sm:p-6">
          <h2 className="font-semibold">
            {t('done', {
              sent: outcomes.filter((o) => o.status === 'sent').length,
              total: outcomes.length,
            })}
          </h2>
          <ul aria-label={t('resultList')} className="grid divide-y divide-border">
            {outcomes.map((o) => (
              <li key={o.line} className="flex flex-wrap items-center gap-x-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  <bdi>{o.email}</bdi>
                </span>
                {o.status === 'sent' ? (
                  <Badge tone="success">{t('sent')}</Badge>
                ) : (
                  <Badge tone="danger">{errors(o.status as 'unknown')}</Badge>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
