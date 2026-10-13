'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Paginated } from '@/lib/api';
import { ApiError } from '@/lib/ts-api';

export function useRecruitmentDirectory<T>(
  fetcher: (query: Record<string, string>) => Promise<Paginated<T>>,
  onDenied: () => void,
  enabled = true,
) {
  const [scope, setScope] = useState({
    query: {} as Record<string, string>,
    page: 1,
    revision: 0,
  });
  const [data, setData] = useState<Paginated<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const refresh = useCallback(() => {
    sequence.current++;
    setScope((value) => ({ ...value, revision: value.revision + 1 }));
  }, []);
  const search = useCallback((query: Record<string, string>) => {
    sequence.current++;
    setScope((value) => ({ query, page: 1, revision: value.revision + 1 }));
  }, []);
  const goTo = useCallback((page: number) => {
    sequence.current++;
    setScope((value) => ({ ...value, page }));
  }, []);
  useEffect(() => {
    const request = ++sequence.current;
    setLoading(true);
    setError('');
    setData(null);
    if (!enabled) { setLoading(false); return; }
    void fetcher({ ...scope.query, page: String(scope.page) })
      .then((result) => {
        if (request !== sequence.current) return;
        const last = Math.max(
          1,
          Math.ceil(result.count / (result.page_size ?? 20)),
        );
        if (scope.page > last) {
          goTo(last);
          return;
        }
        setData(result);
      })
      .catch((caught) => {
        if (request !== sequence.current) return;
        if (caught instanceof ApiError && [401, 403].includes(caught.status))
          onDenied();
        else
          setError(
            caught instanceof Error
              ? caught.message
              : 'Could not load this directory.',
          );
      })
      .finally(() => {
        if (request === sequence.current) setLoading(false);
      });
    return () => {
      sequence.current++;
    };
  }, [fetcher, onDenied, scope, goTo, enabled]);
  return {
    data,
    loading,
    error,
    page: scope.page,
    query: scope.query,
    refresh,
    search,
    goTo,
  };
}
