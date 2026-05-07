import { describe, expect, it } from 'vitest';
import {
  createBookmarksPageSearchParams,
  readBookmarksPageRawPageParam,
  readBookmarksPageRawQueryParam,
  readBookmarksPageSearchPage,
  readBookmarksPageSearchQuery
} from './bookmarksPageSearchParams';

describe('bookmarksPageSearchParams', () => {
  it('reads bookmark search query and page values', () => {
    const searchParams = new URLSearchParams('q=brunch&page=3');

    expect(readBookmarksPageRawQueryParam(searchParams)).toBe('brunch');
    expect(readBookmarksPageSearchQuery(searchParams)).toBe('brunch');
    expect(readBookmarksPageRawPageParam(searchParams)).toBe('3');
    expect(readBookmarksPageSearchPage(searchParams)).toBe(3);
  });

  it('returns null when the bookmark page value is invalid', () => {
    const searchParams = new URLSearchParams('page=0');

    expect(readBookmarksPageSearchPage(searchParams)).toBeNull();
  });

  it('removes blank bookmark searches and page 1 when writing search params', () => {
    const searchParams = new URLSearchParams('q=brunch&page=4');
    const nextSearchParams = createBookmarksPageSearchParams(searchParams, {
      page: 1,
      query: '   '
    });

    expect(nextSearchParams.toString()).toBe('');
  });

  it('writes bookmark search params for page values above 1', () => {
    const searchParams = new URLSearchParams('q=brunch');
    const nextSearchParams = createBookmarksPageSearchParams(searchParams, {
      page: 2,
      query: 'brunch'
    });

    expect(nextSearchParams.toString()).toBe('q=brunch&page=2');
  });
});
