// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { IFormFile } from './iFormFile';
import type { ResourceSourceType } from './resourceSourceType';

export type PostApiResourcesBody = {
  /** @maxLength 200 */
  Title?: string;
  SourceType?: ResourceSourceType;
  File?: IFormFile;
};
