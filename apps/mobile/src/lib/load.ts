import type { ErrorCode, Result } from '@tadriss/shared';
import { useCallback, useEffect, useRef, useState } from 'react';

export type Loaded<T> =
  { status: 'loading' } | { status: 'error'; error: ErrorCode } | { status: 'ready'; data: T };

/**
 * Runs a shared-layer query and keeps its state. `reload()` re-runs it without flashing the
 * spinner (pull-to-refresh and polling); changing `key` starts over.
 */
export function useLoad<T>(
  run: () => Promise<Result<T>>,
  key: string,
): { state: Loaded<T>; reload: () => Promise<void> } {
  const [state, setState] = useState<Loaded<T>>({ status: 'loading' });
  const runRef = useRef(run);
  runRef.current = run;

  const reload = useCallback(async () => {
    const res = await runRef.current();
    setState(res.ok ? { status: 'ready', data: res.data } : { status: 'error', error: res.error });
  }, []);

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    void runRef.current().then((res) => {
      if (!alive) return;
      setState(
        res.ok ? { status: 'ready', data: res.data } : { status: 'error', error: res.error },
      );
    });
    return () => {
      alive = false;
    };
  }, [key]);

  return { state, reload };
}
