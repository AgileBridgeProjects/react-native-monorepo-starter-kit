// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0

export interface UpdateRoleRequest {
  /** @maxLength 64 */
  name: string;
  /**
   * @maxLength 500
   * @nullable
   */
  description?: string | null;
  isElevated?: boolean;
  isPortalRole?: boolean;
  /** @nullable */
  clubId?: string | null;
}
