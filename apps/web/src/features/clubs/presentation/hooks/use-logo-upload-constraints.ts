import { clubDatasource } from '@features/clubs/infrastructure/datasources/club-datasource';
import { queryCacheConfig } from '@lib/http/query-config';
import { useQuery } from '@tanstack/react-query';

/**
 * Fetches the server-canonical logo upload constraints. Cached with the
 * `static` preset because constraints rarely change. The query is anonymous —
 * the backend endpoint is `[AllowAnonymous]` so this can fire before login.
 *
 * Consumers should pass the returned `acceptedMimeTypes` and `maxFileSizeMb`
 * straight through to the upload field; never duplicate these values in
 * frontend constants.
 */
export function useLogoUploadConstraints() {
  return useQuery({
    queryKey: ['clubs', 'upload-constraints'] as const,
    queryFn: () => clubDatasource.getUploadConstraints(),
    select: (data) => {
      // Orval emits `number | string` for int64 fields; coerce once at this boundary.
      const maxFileSizeBytes = Number(data.maxFileSizeBytes);
      return {
        acceptedMimeTypes: data.allowedContentTypes,
        acceptedAttribute: data.allowedContentTypes.join(','),
        maxFileSizeBytes,
        maxFileSizeMb: Math.floor(maxFileSizeBytes / (1024 * 1024)),
      };
    },
    ...queryCacheConfig.static,
  });
}
