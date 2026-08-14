// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import { customInstance } from '../../../lib/http/orval-mutator';

export const get = () => {
  return customInstance<void>({ url: `/`, method: 'GET' });
};
export const getHealthz = () => {
  return customInstance<void>({ url: `/healthz`, method: 'GET' });
};
export type GetResult = NonNullable<Awaited<ReturnType<typeof get>>>;
export type GetHealthzResult = NonNullable<Awaited<ReturnType<typeof getHealthz>>>;
