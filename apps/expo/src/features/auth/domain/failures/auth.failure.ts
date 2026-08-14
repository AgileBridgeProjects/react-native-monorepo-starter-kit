// Re-exported from @starterkit/shared — single source of truth for auth failures.
// Both apps share the same Firebase error codes and user-facing failure classes.
export {
  AuthFailure,
  EmailAlreadyInUseFailure,
  InvalidCredentialsFailure,
  InvalidEmailFailure,
  TokenExpiredFailure,
  UserNotFoundFailure,
  WeakPasswordFailure,
} from '@starterkit/shared';
