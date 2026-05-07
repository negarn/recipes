import { useRef } from 'react';
import {
  createAsyncActionQueueRef,
  type AsyncActionQueueRef
} from '../helpers/asyncQueue';

export function useAsyncQueueRef() {
  const queueRef = useRef<AsyncActionQueueRef | null>(null);

  if (!queueRef.current) {
    queueRef.current = createAsyncActionQueueRef();
  }

  return queueRef.current;
}
