"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "../api/errors";

type QueryStatus = "idle" | "loading" | "success" | "error";

export type UseQueryResult<T> = {
  data: T | null;
  error: ApiError | Error | null;
  status: QueryStatus;
  isLoading: boolean;
  refetch: () => Promise<T | null>;
};

/**
 * Standardized data loader — modules pass a fetcher, get loading/error/data.
 * Pass `enabled: false` to skip until ready (e.g. wait for auth).
 */
export function useQuery<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options?: { enabled?: boolean },
): UseQueryResult<T> {
  const enabled = options?.enabled ?? true;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [status, setStatus] = useState<QueryStatus>("idle");
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(async () => {
    if (!enabled) return null;
    setStatus("loading");
    setError(null);
    try {
      const result = await fetcherRef.current();
      setData(result);
      setStatus("success");
      return result;
    } catch (err) {
      const next = err instanceof Error ? err : new Error(String(err));
      setError(next);
      setStatus("error");
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    data,
    error,
    status,
    isLoading: status === "loading" || (status === "idle" && enabled),
    refetch,
  };
}

export type UseMutationResult<TArgs extends unknown[], TResult> = {
  mutate: (...args: TArgs) => Promise<TResult>;
  data: TResult | null;
  error: ApiError | Error | null;
  isLoading: boolean;
  reset: () => void;
};

/** Standardized mutation — wraps any async API call with loading/error state */
export function useMutation<TArgs extends unknown[], TResult>(
  mutationFn: (...args: TArgs) => Promise<TResult>,
): UseMutationResult<TArgs, TResult> {
  const [data, setData] = useState<TResult | null>(null);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const mutate = useCallback(
    async (...args: TArgs) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await mutationFn(...args);
        setData(result);
        return result;
      } catch (err) {
        const next = err instanceof Error ? err : new Error(String(err));
        setError(next);
        throw next;
      } finally {
        setIsLoading(false);
      }
    },
    [mutationFn],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { mutate, data, error, isLoading, reset };
}
