import type { CompleteSetupRequest, ValidateSetupTokenResponse } from '@/src/proxy/models';
import {
  getApiUsersSetupValidate,
  postApiUsersMeChangePassword,
  postApiUsersSetupComplete,
  postApiUsersSetupPasswordResetRequest,
} from '@/src/proxy/services/users/users';

export const userSetupDatasource = {
  async validateSetupToken(token: string): Promise<ValidateSetupTokenResponse> {
    return getApiUsersSetupValidate({ token });
  },

  async completeSetup(input: CompleteSetupRequest): Promise<void> {
    await postApiUsersSetupComplete(input);
  },

  async requestPasswordReset(email: string): Promise<string | null> {
    const result = await postApiUsersSetupPasswordResetRequest({ email });
    return result?.resetLink ?? null;
  },

  async changePassword(newPassword: string): Promise<void> {
    await postApiUsersMeChangePassword({ newPassword });
  },
};
