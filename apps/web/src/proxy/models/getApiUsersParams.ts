// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { AuthenticationMethod } from './authenticationMethod';
import type { SetupStatus } from './setupStatus';

export type GetApiUsersParams = {
  ClubId?: string;
  TeamId?: string;
  IsActive?: boolean;
  AuthMethod?: AuthenticationMethod;
  RoleName?: string;
  SetupStatus?: SetupStatus;
  /**
   * @minLength 0
   * @maxLength 200
   */
  FilterText?: string;
  SortBy?: string;
  SortDescending?: boolean;
  /**
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  Page?: number | string;
  /**
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  PageSize?: number | string;
  /**
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  ClampedPage?: number | string;
  /**
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  ClampedPageSize?: number | string;
};
