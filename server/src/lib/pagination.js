export const DEFAULT_LIST_TAKE = 50;
export const MAX_LIST_TAKE = 100;

/** Parse `take` / `skip` from list query params. */
export function parseListPagination(query = {}) {
  let take = DEFAULT_LIST_TAKE;
  if (query.take != null && query.take !== '') {
    const n = Number.parseInt(String(query.take), 10);
    if (Number.isFinite(n) && n > 0) take = Math.min(n, MAX_LIST_TAKE);
  }
  let skip = 0;
  if (query.skip != null && query.skip !== '') {
    const n = Number.parseInt(String(query.skip), 10);
    if (Number.isFinite(n) && n >= 0) skip = n;
  }
  return { take, skip };
}

/** Shape a page when the query used `take + 1` to detect a next page. */
export function paginatedResult(rows, { take, skip }) {
  const hasMore = rows.length > take;
  const items = hasMore ? rows.slice(0, take) : rows;
  return {
    items,
    pagination: {
      take,
      skip,
      hasMore,
      nextSkip: hasMore ? skip + take : null,
    },
  };
}
