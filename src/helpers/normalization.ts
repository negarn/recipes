export function isRecordLike(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function normalizeRecordEntries<T>(
  value: unknown,
  normalizeEntryValue: (entryValue: unknown, entryKey: string) => T | null
) {
  if (!isRecordLike(value)) {
    return {} as Record<string, T>;
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([entryKey, entryValue]) => {
      const normalizedEntryValue = normalizeEntryValue(entryValue, entryKey);

      return normalizedEntryValue === null
        ? []
        : [[entryKey, normalizedEntryValue] satisfies [string, T]];
    })
  ) as Record<string, T>;
}
