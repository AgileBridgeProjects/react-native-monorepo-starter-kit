// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { ReflectionTemplateSummaryResponse } from './reflectionTemplateSummaryResponse';

export interface ReflectionTemplateListResponse {
  items?: ReflectionTemplateSummaryResponse[];
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  totalCount?: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  page?: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  pageSize?: number | string;
  hasNextPage?: boolean;
}
