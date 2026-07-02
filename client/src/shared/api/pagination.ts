export type PaginatedResponse<T> = {
  items: T[];
  pagination: {
    take: number;
    skip: number;
    hasMore: boolean;
    nextSkip: number | null;
  };
};

export type ListQueryParams = {
  take?: number;
  skip?: number;
};

function buildQuery(params?: Record<string, string | number | undefined>) {
  if (!params) return '';
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') q.set(key, String(value));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function listQueryString(
  params?: Record<string, string | number | undefined> & ListQueryParams,
) {
  return buildQuery(params);
}
