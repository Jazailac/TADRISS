'use client';

import { Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useActionState, useEffect, useRef } from 'react';
import { markThreadReadAction, sendMessageAction } from '@/app/actions/messages';
import { useRouter } from '@/i18n/navigation';
import { Button } from '../ui/button';
import { FieldError, Textarea } from '../ui/field';

/** Marks the incoming messages read once the thread is on screen (never during render). */
export function MarkThreadRead({ otherId, unread }: { otherId: string; unread: boolean }) {
  const router = useRouter();
  const fired = useRef(false);
  useEffect(() => {
    if (!unread || fired.current) return;
    fired.current = true;
    void markThreadReadAction(otherId).then((res) => {
      if (res.ok) router.refresh();
    });
  }, [otherId, unread, router]);
  return null;
}

/** New messages arrive without a reload: re-read the thread every 15 s while the tab is visible. */
export function ThreadAutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, 15_000);
    return () => {
      clearInterval(id);
    };
  }, [router]);
  return null;
}

/** Keeps the newest message in view when the thread loads or grows. */
export function ScrollToEnd({ count }: { count: number }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [count]);
  return <div ref={end} aria-hidden />;
}

export function Composer({ recipientId }: { recipientId: string }) {
  const t = useTranslations('messages');
  const e = useTranslations('errors');
  const v = useTranslations('validation');
  const [state, formAction, pending] = useActionState(sendMessageAction, null);
  const box = useRef<HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.done) box.current?.focus();
  }, [state]);

  const err = state?.error && state.error !== 'validation' ? state.error : null;
  const fieldErr = state?.fields?.body;

  return (
    <form
      ref={form}
      action={formAction}
      noValidate
      className="grid gap-2 border-t border-border bg-background pt-3"
    >
      <input type="hidden" name="recipientId" value={recipientId} />
      <label htmlFor="thread-body" className="sr-only">
        {t('thread.composer')}
      </label>
      <div className="flex items-end gap-2">
        <Textarea
          ref={box}
          id="thread-body"
          name="body"
          dir="auto"
          rows={2}
          placeholder={t('thread.placeholder')}
          defaultValue={state?.error ? state.values?.body : ''}
          aria-invalid={fieldErr ? true : undefined}
          className="min-h-12 flex-1 resize-y"
          onKeyDown={(event) => {
            // Enter sends; Shift+Enter makes a new line.
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              form.current?.requestSubmit();
            }
          }}
        />
        <Button
          type="submit"
          pending={pending}
          icon={<Send className="rtl-flip size-4" aria-hidden />}
        >
          {t('actions.send')}
        </Button>
      </div>
      <FieldError id="thread-body-error">{err ? e(err) : fieldErr ? v(fieldErr) : null}</FieldError>
    </form>
  );
}
