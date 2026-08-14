import type { LinkedOrganisationDto } from '@/src/proxy/models/linkedOrganisationDto';
import { getApiAuthMeOrganisations } from '@/src/proxy/services/auth/auth';

export const organisationsDatasource = {
  async getLinkedOrganisations(): Promise<LinkedOrganisationDto[]> {
    return getApiAuthMeOrganisations();
  },
};
