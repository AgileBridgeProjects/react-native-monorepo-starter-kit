import { userDatasource } from '@features/users/infrastructure/datasources/user-datasource';
import { useMutation } from '@tanstack/react-query';
import type { BulkUploadConfirmRequest, BulkUploadConfirmResponse } from '@/proxy/models';

export function useBulkUploadConfirm() {
  return useMutation<BulkUploadConfirmResponse, Error, BulkUploadConfirmRequest>({
    mutationFn: (request) => userDatasource.confirmBulkUpload(request),
  });
}
