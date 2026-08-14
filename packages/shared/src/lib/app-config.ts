/**
 * Shared application identity constants.
 *
 * Single source of truth for the product name and portal label across
 * apps/expo and apps/web. Update here when the product name changes.
 */

export const appConfig = {
  /** The product name displayed in UI surfaces (brand, titles, headings). */
  name: 'StarterKit',
  /** Full title for the web admin portal. */
  adminPortalTitle: 'StarterKit Admin Portal',
  /** Full title for the mobile app. */
  mobileAppTitle: 'StarterKit',
} as const;
