import { ApiError } from '@starterkit/shared';

export function makeApiError(
  status = 400,
  message = 'Bad Request',
  code?: string,
  details?: unknown,
): ApiError {
  return new ApiError(status, message, code, details);
}

export function makeNotFoundError(id = 'resource-1'): ApiError {
  return new ApiError(404, `Resource "${id}" was not found.`, 'NOT_FOUND');
}

export function makeUnauthorizedError(): ApiError {
  return new ApiError(401, 'Unauthorized.', 'UNAUTHORIZED');
}

export function makeServerError(): ApiError {
  return new ApiError(500, 'Internal Server Error.', 'INTERNAL_SERVER_ERROR');
}

/**
 * Builds a minimal Axios-shaped error for testing `ApiError.fromAxiosError`.
 */
export function makeAxiosError(
  status: number,
  data?: { message?: string; code?: string; details?: unknown },
) {
  return {
    isAxiosError: true,
    response: { status, data },
    message: 'Request failed',
  } as unknown as import('axios').AxiosError;
}

/**
 * Builds a paginated list response shape matching the backend's PaginatedList.
 */
export function makePaginationResponse<T>(items: T[], total?: number) {
  return {
    items,
    totalCount: total ?? items.length,
    page: 1,
    pageSize: 25,
    hasNextPage: false,
  };
}
