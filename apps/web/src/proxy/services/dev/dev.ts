// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0

import { customInstance } from '../../../lib/http/orval-mutator';
import type {
  BackfillSnapshotsResponse,
  BootstrapAdminResponse,
  PostApiDevBackfillSnapshotsParams,
} from '../../models';

export const postApiDevBootstrapAdmin = () => {
  return customInstance<BootstrapAdminResponse>({
    url: `/api/dev/bootstrap-admin`,
    method: 'POST',
  });
};
export const postApiDevBootstrapPhone = () => {
  return customInstance<BootstrapAdminResponse>({
    url: `/api/dev/bootstrap-phone`,
    method: 'POST',
  });
};
export const postApiDevBackfillSnapshots = (params?: PostApiDevBackfillSnapshotsParams) => {
  return customInstance<BackfillSnapshotsResponse>({
    url: `/api/dev/backfill-snapshots`,
    method: 'POST',
    params,
  });
};
export const postApiDevInitStorage = () => {
  return customInstance<void>({ url: `/api/dev/init-storage`, method: 'POST' });
};
export type PostApiDevBootstrapAdminResult = NonNullable<
  Awaited<ReturnType<typeof postApiDevBootstrapAdmin>>
>;
export type PostApiDevBootstrapPhoneResult = NonNullable<
  Awaited<ReturnType<typeof postApiDevBootstrapPhone>>
>;
export type PostApiDevBackfillSnapshotsResult = NonNullable<
  Awaited<ReturnType<typeof postApiDevBackfillSnapshots>>
>;
export type PostApiDevInitStorageResult = NonNullable<
  Awaited<ReturnType<typeof postApiDevInitStorage>>
>;
