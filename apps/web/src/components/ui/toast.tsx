'use client';

import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cx } from './cx';

type Toast = { id: number; tone: 'success' | 'danger'; text: string };
type ToastApi = { success: (text: string) => void; error: (text: string) => void };

const Ctx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(Ctx);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
}

const LIFETIME_MS = 5000;

/** Polite live region + auto-dismissing toasts. Feedback for actions that don't navigate. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslations('common');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((l) => l.filter((x) => x.id !== id));
  }, []);
  const push = useCallback(
    (tone: Toast['tone'], text: string) => {
      const id = next.current++;
      setToasts((l) => [...l.slice(-2), { id, tone, text }]);
      setTimeout(() => {
        dismiss(id);
      }, LIFETIME_MS);
    },
    [dismiss],
  );
  const api = useMemo<ToastApi>(
    () => ({
      success: (x) => {
        push('success', x);
      },
      error: (x) => {
        push('danger', x);
      },
    }),
    [push],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] grid justify-items-center gap-2 sm:inset-x-auto sm:end-5 sm:justify-items-end"
      >
        {toasts.map((x) => (
          <div
            key={x.id}
            className={cx(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-surface p-4 text-sm shadow-lg animate-rise',
              x.tone === 'success' ? 'border-success/30' : 'border-danger/30',
            )}
          >
            {x.tone === 'success' ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            ) : (
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
            )}
            <p className="min-w-0 flex-1">{x.text}</p>
            <button
              type="button"
              onClick={() => {
                dismiss(x.id);
              }}
              aria-label={t('close')}
              className="-me-1 -mt-1 grid size-7 place-items-center rounded-md text-text-muted hover:bg-surface-muted"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
