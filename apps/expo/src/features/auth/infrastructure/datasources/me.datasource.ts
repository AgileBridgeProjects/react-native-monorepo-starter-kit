import type { MeResponse } from '@/src/proxy/models/meResponse';
import { getApiAuthMe } from '@/src/proxy/services/auth/auth';

export const meDatasource = {
  async getMe(): Promise<MeResponse> {
    return getApiAuthMe();
  },
};
