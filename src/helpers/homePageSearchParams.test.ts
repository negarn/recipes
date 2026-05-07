import { describe, expect, it } from 'vitest';
import {
  createHomePageSearchParams,
  readHomePageAudience,
  readHomePageRawAudienceParam,
  readHomePageSearchPage,
  readHomePageSearchQuery
} from './homePageSearchParams';

describe('homePageSearchParams', () => {
  it('defaults to adults when no audience parameter is present', () => {
    const searchParams = new URLSearchParams('q=rice&page=2');

    expect(readHomePageRawAudienceParam(searchParams)).toBeNull();
    expect(readHomePageAudience(searchParams)).toBe('adults');
  });

  it('reads children from the audience parameter', () => {
    const searchParams = new URLSearchParams('audience=children');

    expect(readHomePageAudience(searchParams)).toBe('children');
  });

  it('writes children audience and removes audience for adults', () => {
    const currentSearchParams = new URLSearchParams('q=rice&page=2');
    const childrenSearchParams = createHomePageSearchParams(currentSearchParams, {
      audience: 'children',
      page: 2,
      query: 'rice'
    });
    const adultsSearchParams = createHomePageSearchParams(childrenSearchParams, {
      audience: 'adults',
      page: 2,
      query: 'rice'
    });

    expect(childrenSearchParams.toString()).toBe('q=rice&page=2&audience=children');
    expect(adultsSearchParams.toString()).toBe('q=rice&page=2');
  });

  it('keeps existing query/page parsing behavior', () => {
    const searchParams = new URLSearchParams('q=chicken&page=3&audience=children');

    expect(readHomePageSearchQuery(searchParams)).toBe('chicken');
    expect(readHomePageSearchPage(searchParams)).toBe(3);
  });
});
