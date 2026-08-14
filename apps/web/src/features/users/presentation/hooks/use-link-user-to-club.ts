import { useMutation } from '@tanstack/react-query';
import { userDatasource } from '../../infrastructure/datasources/user-datasource';

interface LinkUserToClubInput {
  userId: string;
  clubId: string;
  role: string;
}

export function useLinkUserToClub() {
  return useMutation({
    mutationFn: ({ userId, clubId, role }: LinkUserToClubInput) =>
      userDatasource.linkToClub(userId, clubId, role),
  });
}
