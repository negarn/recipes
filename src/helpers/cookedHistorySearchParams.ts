const COOKED_HISTORY_PAGE_QUERY_PARAM = 'historyPage';

export function readCookedHistoryRawPageParam(searchParams: URLSearchParams) {
  return searchParams.get(COOKED_HISTORY_PAGE_QUERY_PARAM);
}

export function readCookedHistoryPage(searchParams: URLSearchParams) {
  const pageValue = Number(readCookedHistoryRawPageParam(searchParams));

  return Number.isInteger(pageValue) && pageValue > 0 ? pageValue : null;
}

export function createCookedHistorySearchParams(
  currentSearchParams: URLSearchParams,
  { page }: { page: number }
) {
  const nextSearchParams = new URLSearchParams(currentSearchParams);

  if (page <= 1) {
    nextSearchParams.delete(COOKED_HISTORY_PAGE_QUERY_PARAM);
  } else {
    nextSearchParams.set(COOKED_HISTORY_PAGE_QUERY_PARAM, String(page));
  }

  return nextSearchParams;
}
