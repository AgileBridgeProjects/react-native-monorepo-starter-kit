/**
 * Paging defaults shared by the clients, mirroring the backend's `PagingConstants`.
 *
 * Page size is a contract with the API, not a per-screen styling choice — keeping the values
 * here means a client can't quietly request a size the server clamps, and the clamp itself
 * (`MAX_PAGE_SIZE`) is visible to whoever is choosing a value.
 */
export const paging = {
  /** First page number the API expects (it is 1-based, not 0-based). */
  FIRST_PAGE: 1,
  /** Server-side default when a request omits pageSize. */
  DEFAULT_PAGE_SIZE: 50,
  /** Server-side ceiling — larger requests are clamped, not rejected. */
  MAX_PAGE_SIZE: 250,
  /**
   * Feed-style lists that page as the user scrolls. Smaller than the server default: these
   * render rich rows, so a first paint of 20-30 is quicker and the next page arrives before
   * the user reaches the end anyway.
   */
  FEED_PAGE_SIZE: 20,
  /**
   * Chat threads. A little larger than {@link paging.FEED_PAGE_SIZE} because message rows are
   * short, so one page needs to fill more vertical space to avoid an immediate second fetch.
   */
  CONVERSATION_PAGE_SIZE: 30,
} as const;
