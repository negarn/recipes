const HOME_PAGE_QUERY_PARAM = 'q';
const HOME_PAGE_PAGE_PARAM = 'page';
const HOME_PAGE_AUDIENCE_PARAM = 'audience';
export type HomePageAudience = 'adults' | 'children';

export function readHomePageRawQueryParam(searchParams: URLSearchParams) {
  return searchParams.get(HOME_PAGE_QUERY_PARAM);
}

export function readHomePageRawPageParam(searchParams: URLSearchParams) {
  return searchParams.get(HOME_PAGE_PAGE_PARAM);
}

export function readHomePageRawAudienceParam(searchParams: URLSearchParams) {
  return searchParams.get(HOME_PAGE_AUDIENCE_PARAM);
}

export function readHomePageSearchQuery(searchParams: URLSearchParams) {
  return readHomePageRawQueryParam(searchParams) ?? '';
}

export function readHomePageSearchPage(searchParams: URLSearchParams) {
  const pageValue = Number(readHomePageRawPageParam(searchParams));

  return Number.isInteger(pageValue) && pageValue > 0 ? pageValue : null;
}

export function readHomePageAudience(searchParams: URLSearchParams): HomePageAudience {
  return readHomePageRawAudienceParam(searchParams) === 'children'
    ? 'children'
    : 'adults';
}

export function createHomePageSearchParams(
  currentSearchParams: URLSearchParams,
  {
    audience,
    page,
    query
  }: {
    audience: HomePageAudience;
    page: number;
    query: string;
  }
) {
  const nextSearchParams = new URLSearchParams(currentSearchParams);

  if (query.trim().length > 0) {
    nextSearchParams.set(HOME_PAGE_QUERY_PARAM, query);
  } else {
    nextSearchParams.delete(HOME_PAGE_QUERY_PARAM);
  }

  if (page <= 1) {
    nextSearchParams.delete(HOME_PAGE_PAGE_PARAM);
  } else {
    nextSearchParams.set(HOME_PAGE_PAGE_PARAM, String(page));
  }

  if (audience === 'adults') {
    nextSearchParams.delete(HOME_PAGE_AUDIENCE_PARAM);
  } else {
    nextSearchParams.set(HOME_PAGE_AUDIENCE_PARAM, audience);
  }

  return nextSearchParams;
}
