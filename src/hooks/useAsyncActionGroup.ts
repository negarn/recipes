import { useCallback, useMemo } from 'react';

type AsyncActionGroupMember = {
  clearError: () => void;
  error: string | null;
  isPending: boolean;
  reset: () => void;
};

export function useAsyncActionGroup(actions: readonly AsyncActionGroupMember[]) {
  const clearErrors = useCallback(() => {
    actions.forEach((action) => {
      action.clearError();
    });
  }, [actions]);

  const resetAll = useCallback(() => {
    actions.forEach((action) => {
      action.reset();
    });
  }, [actions]);

  const firstError = useMemo(
    () => actions.find((action) => action.error)?.error ?? null,
    [actions]
  );
  const isAnyPending = useMemo(
    () => actions.some((action) => action.isPending),
    [actions]
  );

  return {
    clearErrors,
    firstError,
    isAnyPending,
    resetAll
  };
}
