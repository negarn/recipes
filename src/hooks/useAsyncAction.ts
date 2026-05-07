import { useEffect, useRef, useState } from 'react';

export function useAsyncAction() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const activeRunIdsRef = useRef<Set<number>>(new Set());
  const isMountedRef = useRef(true);
  const nextRunIdRef = useRef(0);
  const resetVersionRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  function clearError() {
    if (isMountedRef.current) {
      setError(null);
    }
  }

  function reset() {
    resetVersionRef.current += 1;
    activeRunIdsRef.current.clear();

    if (!isMountedRef.current) {
      return;
    }

    setError(null);
    setIsPending(false);
  }

  async function run(
    action: () => Promise<void>,
    errorMessage: string,
    {
      onError,
      onSettled,
      onSuccess
    }: {
      onError?: (error: unknown) => void;
      onSettled?: () => void;
      onSuccess?: () => void;
    } = {}
  ): Promise<boolean> {
    const runId = nextRunIdRef.current + 1;
    nextRunIdRef.current = runId;
    const runResetVersion = resetVersionRef.current;
    activeRunIdsRef.current.add(runId);

    if (isMountedRef.current) {
      setError(null);
      setIsPending(true);
    }

    try {
      await action();

      if (!isMountedRef.current || resetVersionRef.current !== runResetVersion) {
        return false;
      }

      onSuccess?.();
      return true;
    } catch (error) {
      if (isMountedRef.current && resetVersionRef.current === runResetVersion) {
        setError(errorMessage);
        onError?.(error);
      }

      return false;
    } finally {
      activeRunIdsRef.current.delete(runId);

      if (isMountedRef.current && resetVersionRef.current === runResetVersion) {
        setIsPending(activeRunIdsRef.current.size > 0);
        onSettled?.();
      }
    }
  }

  return {
    clearError,
    error,
    isPending,
    reset,
    run
  };
}
