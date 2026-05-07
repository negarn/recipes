import { useEffect, useState } from 'react';

export function useSyncedDraftState<T>(value: T, resetKey?: unknown) {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [resetKey, value]);

  return [draftValue, setDraftValue] as const;
}
