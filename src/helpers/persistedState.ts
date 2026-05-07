import { queueAsyncAction, type AsyncActionQueueRef } from './asyncQueue';

export function createPersistedStateMutationHandler<Args extends unknown[], T>({
  applyState,
  onSuccess,
  persist,
  queueRef
}: {
  applyState: (value: T) => void | Promise<void>;
  onSuccess?: (value: T) => void;
  persist: (...args: Args) => Promise<T>;
  queueRef?: AsyncActionQueueRef;
}) {
  const runPersistedUpdate = async (...args: Args) => {
    const nextValue = await persist(...args);
    onSuccess?.(nextValue);
    await applyState(nextValue);
  };

  if (!queueRef) {
    return runPersistedUpdate;
  }

  return (...args: Args) => queueAsyncAction(queueRef, () => runPersistedUpdate(...args));
}

export function queuePersistedStateUpdate<T>({
  applyState,
  getCurrentValue,
  getNextValue,
  persist,
  queueRef,
  shouldSkip = Object.is as (nextValue: T, currentValue: T) => boolean
}: {
  applyState: (value: T) => void | Promise<void>;
  getCurrentValue: () => T;
  getNextValue: (currentValue: T) => T;
  persist: (value: T) => Promise<T>;
  queueRef: AsyncActionQueueRef;
  shouldSkip?: (nextValue: T, currentValue: T) => boolean;
}) {
  return queueAsyncAction(queueRef, async () => {
    const currentValue = getCurrentValue();
    const nextValue = getNextValue(currentValue);

    if (shouldSkip(nextValue, currentValue)) {
      return;
    }

    const persistedValue = await persist(nextValue);
    await applyState(persistedValue);
  });
}
