const BOOKMARKS_PAGE_QUERY_PARAM = 'q';
const BOOKMARKS_PAGE_PAGE_PARAM = 'page';

export function readBookmarksPageRawQueryParam(searchParams: URLSearchParams) {
  return searchParams.get(BOOKMARKS_PAGE_QUERY_PARAM);
}

export function readBookmarksPageRawPageParam(searchParams: URLSearchParams) {
  return searchParams.get(BOOKMARKS_PAGE_PAGE_PARAM);
}

export function readBookmarksPageSearchQuery(searchParams: URLSearchParams) {
  return readBookmarksPageRawQueryParam(searchParams) ?? '';
}

export function readBookmarksPageSearchPage(searchParams: URLSearchParams) {
  const pageValue = Number(readBookmarksPageRawPageParam(searchParams));

  return Number.isInteger(pageValue) && pageValue > 0 ? pageValue : null;
}

export function createBookmarksPageSearchParams(
  currentSearchParams: URLSearchParams,
  {
    page,
    query
  }: {
    page: number;
    query: string;
  }
) {
  const nextSearchParams = new URLSearchParams(currentSearchParams);

  if (query.trim().length > 0) {
    nextSearchParams.set(BOOKMARKS_PAGE_QUERY_PARAM, query);
  } else {
    nextSearchParams.delete(BOOKMARKS_PAGE_QUERY_PARAM);
  }

  if (page <= 1) {
    nextSearchParams.delete(BOOKMARKS_PAGE_PAGE_PARAM);
  } else {
    nextSearchParams.set(BOOKMARKS_PAGE_PAGE_PARAM, String(page));
  }

  return nextSearchParams;
}
