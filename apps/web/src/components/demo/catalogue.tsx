'use client';
import { Check, Printer, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Input, inputStyles } from '../ui/field';
import { EmptyState } from '../ui/empty-state';
import { WorkflowPreview, type Module } from '../marketing/workflow-preview';
import { Link } from '@/i18n/navigation';
import { cx } from '../ui/cx';
const modules: Module[] = ['attendance', 'grades', 'schedule', 'finance'];
const names = ['s1', 's2', 's3'] as const;
export function Catalogue() {
  const t = useTranslations('studio');
  const v = useTranslations('home.features.visual');
  const demo = useTranslations('demo.kit');
  const roles = useTranslations('shell.roles');
  const [module, setModule] = useState<Module>('attendance');
  const [dense, setDense] = useState(false);
  const [status, setStatus] = useState(['present', 'late', 'present']);
  const [saved, setSaved] = useState(false);
  const [grades, setGrades] = useState(['16', '14.5', '18']);
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <div className="mx-auto grid grid-cols-1 max-w-6xl gap-8">
      <header>
        <p className="eyebrow">{t('preview')}</p>
        <h1 className="display mt-4 text-4xl">{t('catalogue')}</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-text-muted">{t('catalogueBody')}</p>
      </header>
      <div className="flex flex-wrap gap-2">
        {(['institution_admin', 'teacher', 'student', 'super_admin'] as const).map((role) => (
          <Link
            key={role}
            href={`/design/roles/${role}`}
            className="rounded-full border border-border bg-surface px-4 py-2 text-sm hover:border-primary hover:text-primary"
          >
            {roles(role)}
          </Link>
        ))}
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
          <div className="flex flex-wrap gap-1" role="group" aria-label={t('modules')}>
            {modules.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={m === module}
                onClick={() => {
                  setModule(m);
                  setSaved(false);
                }}
                className={cx(
                  'rounded-lg px-3 py-2 text-sm',
                  m === module
                    ? 'bg-primary text-primary-foreground'
                    : 'text-text-muted hover:bg-surface-muted',
                )}
              >
                {t(m)}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-pressed={dense}
            onClick={() => {
              setDense((d) => !d);
            }}
            className="rounded-md border border-border px-3 py-2 text-xs"
          >
            {t(dense ? 'comfortable' : 'compact')}
          </button>
        </div>
        <div className="p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap justify-between gap-3">
            <h2 className="text-lg font-semibold">{t(module)}</h2>
            <Badge tone="accent">{t('modulePreview')}</Badge>
          </div>
          {module === 'attendance' || module === 'grades' ? (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table
                className={cx(
                  'w-full min-w-[27rem] text-start text-sm',
                  dense ? '[&_td]:py-2' : '[&_td]:py-4',
                )}
              >
                <thead className="sticky top-0 bg-surface-muted text-xs text-text-muted">
                  <tr>
                    <th className="p-3">
                      <input
                        type="checkbox"
                        aria-label={t('student')}
                        checked={selected.length === names.length}
                        onChange={(e) => {
                          setSelected(e.target.checked ? [...names] : []);
                        }}
                      />
                    </th>
                    <th className="p-3 text-start">{t('student')}</th>
                    <th className="p-3 text-start">
                      {t(module === 'attendance' ? 'attendance' : 'grade')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {names.map((name, i) => (
                    <tr
                      key={name}
                      className={
                        selected.includes(name) ? 'bg-primary-soft/50' : 'hover:bg-background'
                      }
                    >
                      <td className="px-3">
                        <input
                          type="checkbox"
                          aria-label={v(name)}
                          checked={selected.includes(name)}
                          onChange={(e) => {
                            setSelected((s) =>
                              e.target.checked ? [...s, name] : s.filter((n) => n !== name),
                            );
                          }}
                        />
                      </td>
                      <td className="px-3 font-medium">{v(name)}</td>
                      <td className="px-3">
                        {module === 'attendance' ? (
                          <select
                            aria-label={`${t('attendance')} · ${v(name)}`}
                            value={status[i]}
                            onChange={(e) => {
                              setStatus((s) =>
                                s.map((value, n) => (n === i ? e.target.value : value)),
                              );
                              setSaved(false);
                            }}
                            className={cx(inputStyles, 'h-10 min-w-36 max-w-48 text-sm')}
                          >
                            {(['present', 'absent', 'late'] as const).map((state) => (
                              <option key={state} value={state}>
                                {t(state)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            aria-label={`${t('grade')} · ${v(name)}`}
                            type="number"
                            min={0}
                            max={20}
                            step={0.5}
                            value={grades[i]}
                            onChange={(e) => {
                              setGrades((g) =>
                                g.map((value, n) => (n === i ? e.target.value : value)),
                              );
                              setSaved(false);
                            }}
                            className="h-10 max-w-32 font-mono"
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <WorkflowPreview module={module} />
          )}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <p role="status" className="text-xs text-text-muted">
              {saved ? t('saved') : t('preview')}
            </p>
            {module === 'finance' ? (
              <Button
                variant="secondary"
                onClick={() => {
                  window.print();
                }}
                icon={<Printer className="size-4" aria-hidden />}
              >
                {t('print')}
              </Button>
            ) : (
              <Button
                disabled={
                  module === 'grades' &&
                  grades.some((g) => g === '' || Number(g) < 0 || Number(g) > 20)
                }
                onClick={() => {
                  setSaved(true);
                }}
                icon={
                  saved ? (
                    <Check className="size-4" aria-hidden />
                  ) : (
                    <Save className="size-4" aria-hidden />
                  )
                }
              >
                {t('save')}
              </Button>
            )}
          </div>
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="text-lg font-semibold">{demo('title')}</h2>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button>{demo('save')}</Button>
          <Button variant="secondary">{demo('secondary')}</Button>
          <Button variant="ghost">{demo('ghost')}</Button>
          <Button pending>{demo('save')}</Button>
          <Button disabled>{demo('secondary')}</Button>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {(['success', 'warning', 'danger', 'info', 'neutral'] as const).map((tone) => (
            <Badge key={tone} tone={tone} dot>
              {demo(`tones.${tone}`)}
            </Badge>
          ))}
        </div>
      </Card>
      <Card>
        <EmptyState title={t('empty')} description={t('emptyBody')} />
      </Card>
    </div>
  );
}
