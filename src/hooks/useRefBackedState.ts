import { useRef, useState, type SetStateAction } from 'react';

function createRefBackedStateSetter<T>(
  valueRef: { current: T },
  setState: (value: T) => void
) {
  return (nextValue: SetStateAction<T>) => {
    const resolvedValue =
      typeof nextValue === 'function'
        ? (nextValue as (currentValue: T) => T)(valueRef.current)
        : nextValue;

    valueRef.current = resolvedValue;
    setState(resolvedValue);
  };
}

export function useRefBackedState<T>(initialValue: T) {
  const [value, setValue] = useState(initialValue);
  const valueRef = useRef(initialValue);
  const setRefBackedValue = createRefBackedStateSetter(valueRef, setValue);

  return [value, setRefBackedValue, valueRef] as const;
}
