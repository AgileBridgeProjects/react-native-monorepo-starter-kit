import { useMutation } from '@tanstack/react-query';
import { userDatasource } from '../../infrastructure/datasources/user-datasource';

interface ExportUsersArgs {
  clubId: string;
  teamId?: string;
}

export function useExportUsers() {
  return useMutation({
    mutationFn: ({ clubId, teamId }: ExportUsersArgs) => userDatasource.exportUsers(clubId, teamId),
  });
}
