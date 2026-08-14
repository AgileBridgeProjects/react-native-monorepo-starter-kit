import { userDatasource } from '@features/users/infrastructure/datasources/user-datasource';
import { useMutation } from '@tanstack/react-query';
import type { BulkUploadPreviewResponse } from '@/proxy/models';

export function useBulkUploadPreview() {
  return useMutation<
    BulkUploadPreviewResponse,
    Error,
    { clubId: string; teamId?: string; file: File }
  >({
    mutationFn: ({ clubId, teamId, file }) =>
      userDatasource.previewBulkUpload(clubId, file, teamId),
  });
}
