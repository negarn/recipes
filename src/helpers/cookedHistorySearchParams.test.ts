import { describe, expect, it } from 'vitest';
import {
  createCookedHistorySearchParams,
  readCookedHistoryPage,
  readCookedHistoryRawPageParam
} from './cookedHistorySearchParams';

describe('cookedHistorySearchParams', () => {
  it('reads valid cooked history page values', () => {
    const searchParams = new URLSearchParams('tab=history&historyPage=3');

    expect(readCookedHistoryRawPageParam(searchParams)).toBe('3');
    expect(readCookedHistoryPage(searchParams)).toBe(3);
  });

  it('returns null when cooked history page is invalid', () => {
    const searchParams = new URLSearchParams('historyPage=0');

    expect(readCookedHistoryPage(searchParams)).toBeNull();
  });

  it('removes the cooked history page query parameter on page 1', () => {
    const searchParams = new URLSearchParams('tab=history&historyPage=4');
    const nextSearchParams = createCookedHistorySearchParams(searchParams, { page: 1 });

    expect(nextSearchParams.toString()).toBe('tab=history');
  });

  it('writes the cooked history page query parameter for page values above 1', () => {
    const searchParams = new URLSearchParams('tab=history');
    const nextSearchParams = createCookedHistorySearchParams(searchParams, { page: 2 });

    expect(nextSearchParams.toString()).toBe('tab=history&historyPage=2');
  });
});
