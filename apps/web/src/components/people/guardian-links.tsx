'use client';

import { relationships, type GuardianLink, type Relationship } from '@tadriss/shared';
import { Link2, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState, useTransition } from 'react';
import { searchStudentsAction, type StudentMatch } from '@/app/actions/finance';
import { linkGuardianAction, unlinkGuardianAction } from '@/app/actions/guardians';
import { useRouter } from '@/i18n/navigation';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Input, Label, Select } from '../ui/field';
import { useToast } from '../ui/toast';

/** A parent's children: remove a link, or find a student and link them. */
export function GuardianLinks({
  parentId,
  parentName,
  links,
}: {
  parentId: string;
  parentName: string;
  links: GuardianLink[];
}) {
  const t = useTranslations('people.guardians');
  const e = useTranslations('errors');
  const c = useTranslations('common');
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [matches, setMatches] = useState<StudentMatch[] | 'loading' | 'error'>('loading');
  const [relationship, setRelationship] = useState<Relationship>('parent');
  const [pending, start] = useTransition();
  const close = () => {
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(
      () => {
        void searchStudentsAction(q).then((res) => {
          if (!cancelled) setMatches(res.ok ? res.data : 'error');
        });
      },
      q === '' ? 0 : 250,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, q]);

  const link = (studentId: string) => {
    start(async () => {
      const res = await linkGuardianAction(parentId, studentId, relationship);
      if (res.ok) {
        toast.success(t('linked'));
        close();
        router.refresh();
      } else toast.error(e(res.error));
    });
  };

  const unlink = (id: string) => {
    start(async () => {
      const res = await unlinkGuardianAction(id);
      if (res.ok) {
        toast.success(t('unlinked'));
        router.refresh();
      } else toast.error(e(res.error));
    });
  };

  return (
    <div className="basis-full ps-14">
      <p className="sr-only">{t('childrenOf', { name: parentName })}</p>
      <ul className="flex flex-wrap items-center gap-2">
        {links.map((l) => (
          <li
            key={l.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted py-1 ps-3 pe-1 text-sm"
          >
            <Link2 className="size-3.5 text-text-muted" aria-hidden />
            <span>
              <bdi>{l.studentName}</bdi> · {t(`relationships.${l.relationship}`)}
            </span>
            <button
              type="button"
              disabled={pending}
              aria-label={t('unlinkLabel', { name: l.studentName })}
              onClick={() => {
                unlink(l.id);
              }}
              className="grid size-6 place-items-center rounded-full text-text-muted hover:bg-border"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            aria-label={t('addLabel', { name: parentName })}
            onClick={() => {
              setQ('');
              setMatches('loading');
              setOpen(true);
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-primary hover:bg-primary-soft"
          >
            <Plus className="size-3.5" aria-hidden />
            {t('add')}
          </button>
        </li>
      </ul>

      <Dialog
        open={open}
        onClose={close}
        title={t('dialogTitle', { name: parentName })}
        description={t('dialogBody')}
      >
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="guardian-relationship">{t('relationship')}</Label>
            <Select
              id="guardian-relationship"
              value={relationship}
              onChange={(event) => {
                setRelationship(event.target.value as Relationship);
              }}
            >
              {relationships.map((r) => (
                <option key={r} value={r}>
                  {t(`relationships.${r}`)}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="guardian-search">{t('search')}</Label>
            <Input
              id="guardian-search"
              type="search"
              value={q}
              autoComplete="off"
              placeholder={t('searchPlaceholder')}
              onChange={(event) => {
                setQ(event.target.value);
              }}
            />
          </div>
          {matches === 'loading' ? (
            <p className="text-sm text-text-muted">{c('loading')}</p>
          ) : matches === 'error' ? (
            <p role="alert" className="text-sm text-danger">
              {e('unknown')}
            </p>
          ) : matches.length === 0 ? (
            <p className="text-sm text-text-muted">{t('noMatch')}</p>
          ) : (
            <ul className="grid gap-1">
              {matches.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      link(m.id);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start hover:bg-primary-soft"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">
                      <bdi>{m.name}</bdi>
                    </span>
                    <span className="text-xs text-text-muted">{m.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end">
            <Button variant="ghost" onClick={close}>
              {c('cancel')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
