/**
 * AuthUser — the shape of a user throughout the auth feature.
 *
 * This is a plain TypeScript interface with no framework dependencies.
 * When the proxy is generated for AuthController, replace this with the
 * proxy-generated UserDto type and delete this file.
 */
// Re-exported from @starterkit/shared — single source of truth for AuthUser.
// Both apps/expo (game players) and apps/web (admins) use the same type
// against the same Firebase project with the same multi-tenant claims structure.
export type { AuthUser } from '@starterkit/shared';
