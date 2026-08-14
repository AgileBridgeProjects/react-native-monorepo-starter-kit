import type { AxiosRequestConfig } from 'axios';

import { apiClient } from './api-client';

/**
 * Custom axios mutator for orval-generated proxy functions.
 *
 * Delegates to the project's singleton `apiClient` so all generated functions
 * automatically use auth interceptors, token refresh, and error normalization.
 *
 * @see https://orval.dev/reference/configuration/output#mutator
 */
export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> =>
  apiClient<T>(config).then(({ data }) => data);
