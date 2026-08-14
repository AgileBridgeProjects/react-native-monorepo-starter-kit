import type { Route } from '@playwright/test';

/**
 * Fulfils a Playwright route with a JSON response body.
 *
 * Removes the repeated `route.fulfill({ status, contentType, body: JSON.stringify(…) })`
 * boilerplate from every mock route handler.
 *
 * @example
 * await page.route('**\/api/clubs**', (route) => fulfillJson(route, MOCKED_LIST));
 */
export function fulfillJson(route: Route, data: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(data),
  });
}

export interface PagedResponseOptions {
  page?: number;
  pageSize?: number;
  hasNextPage?: boolean;
}

/**
 * Builds the standard paginated list response envelope used by all StarterKit
 * list endpoints (`{ items, totalCount, page, pageSize, hasNextPage }`).
 *
 * Defaults: `page=1`, `pageSize=50`, `hasNextPage=false`.
 *
 * @example
 * await page.route('**\/api/clubs**', (route) =>
 *   fulfillJson(route, pagedResponse(items, 2)),
 * );
 */
export function pagedResponse<T>(
  items: T[],
  totalCount: number,
  options: PagedResponseOptions = {},
): object {
  const { page = 1, pageSize = 50, hasNextPage = false } = options;
  return { items, totalCount, page, pageSize, hasNextPage };
}

/**
 * Extracts pagination query params from a URL string, handling both the
 * capitalised (`Page` / `PageSize`) and lowercase (`page` / `pageSize`)
 * variant that the DX CustomStore may send depending on configuration.
 *
 * @example
 * const { page, pageSize } = getPageParams(response.url());
 * expect(page).toBe('2');
 * expect(pageSize).toBe('50');
 */
export function getPageParams(url: string): { page: string | null; pageSize: string | null } {
  const u = new URL(url);
  return {
    page: u.searchParams.get('Page') ?? u.searchParams.get('page'),
    pageSize: u.searchParams.get('PageSize') ?? u.searchParams.get('pageSize'),
  };
}
