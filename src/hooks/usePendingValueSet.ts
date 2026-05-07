import { useRefBackedState } from './useRefBackedState';

export function usePendingValueSet<T>() {
  const [, setPendingValues, pendingValuesRef] = useRefBackedState<Set<T>>(new Set());

  function has(value: T) {
    return pendingValuesRef.current.has(value);
  }

  function add(value: T) {
    if (pendingValuesRef.current.has(value)) {
      return false;
    }

    setPendingValues((currentPendingValues) => {
      const nextPendingValues = new Set(currentPendingValues);
      nextPendingValues.add(value);
      return nextPendingValues;
    });
    return true;
  }

  function remove(value: T) {
    if (!pendingValuesRef.current.has(value)) {
      return;
    }

    setPendingValues((currentPendingValues) => {
      const nextPendingValues = new Set(currentPendingValues);
      nextPendingValues.delete(value);
      return nextPendingValues;
    });
  }

  async function track(value: T, action: () => Promise<void>) {
    if (!add(value)) {
      return;
    }

    try {
      await action();
    } finally {
      remove(value);
    }
  }

  return {
    has,
    track
  };
}
