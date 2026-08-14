/**
 * Hand-written proxy for GET /api/auth/me.
 * Do NOT auto-generate — this file is manually maintained.
 */
import { customInstance } from '../../../lib/http/orval-mutator';

export interface MeResponse {
  roles: string[];
  isActive: boolean | null;
  hasPortalAccess?: boolean;
  permissions?: string[];
  clubName?: string | null;
  clubId?: string | null;
  clubLogoUrl?: string | null;
}

export const getApiAuthMe = () =>
  customInstance<MeResponse>({ url: '/api/auth/me', method: 'GET' });
