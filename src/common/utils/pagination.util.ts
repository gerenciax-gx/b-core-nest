/**
 * Calculates pagination metadata.
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): { total: number; page: number; limit: number; totalPages: number } {
  return {
    total,
    page,
    limit,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  };
}

/**
 * Sanitizes pagination query params with defaults.
 */
export function sanitizePagination(query: { page?: number; limit?: number }): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
