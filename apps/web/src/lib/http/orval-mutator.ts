import type { AxiosRequestConfig } from 'axios';

import { apiClient } from './api-client';

/**
 * Custom axios mutator for orval-generated proxy functions.
 *
 * Delegates to the project's singleton `apiClient` so all generated functions
 * share the same base URL and default headers. Interceptors (auth, error
 * normalisation) can be added to `apiClient` as the web app matures.
 *
 * @see https://orval.dev/reference/configuration/output#mutator
 */
export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> =>
  apiClient<T>(config).then(({ data }) => data);

/**
 * Variant of customInstance for endpoints that return binary file content.
 * Sets `responseType: 'blob'` so Axios buffers the response as a Blob instead
 * of attempting to parse it as JSON or a string.
 *
 * The generic parameter is accepted but intentionally ignored — Orval passes
 * the OpenAPI response schema type (e.g. `FileContentResult`) but the axios
 * response will always be a `Blob` when `responseType: 'blob'` is set.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const blobInstance = <_T = Blob>(config: AxiosRequestConfig): Promise<Blob> =>
  apiClient<Blob>({ ...config, responseType: 'blob' }).then(({ data }) => data);
