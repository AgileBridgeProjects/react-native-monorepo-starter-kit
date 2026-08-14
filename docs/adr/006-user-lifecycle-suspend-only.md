# ADR-006: User Lifecycle — Suspend-Only Policy (No Hard Delete)

**Date:** 2026-04-28  
**Status:** Accepted  
**Deciders:** Engineering team

---

## Context

The Users feature needs an administrative action to revoke a user's access. Two approaches were considered:

1. **Hard delete** — permanently remove the `UserEntity` row from the database.
2. **Suspend (soft disable)** — flip `UserEntity.IsActive = false`, leaving the row intact.

---

## Decision

Users are **never hard-deleted** through the admin portal. The only lifecycle transition available to administrators is suspend (`IsActive = false`) and reactivate (`IsActive = true`).

The `PATCH /api/users/{id}/status` endpoint is the sole mechanism for changing a user's active state.

---

## Rationale

- **Audit integrity** — audit log entries, game scores, and other domain records reference `UserId`. Deleting the row would orphan those records or require cascading deletes that destroy audit history.
- **POPIA/GDPR erasure** — right-to-erasure requests must go through a formal data-erasure workflow (anonymisation of PII fields) rather than a simple row delete. See `docs/standards/nfr-compliance.md`.
- **Reversibility** — suspension is immediately reversible without data loss. A mistaken delete is not.
- **Firebase Auth** — the user's Firebase account is managed separately. Suspending in StarterKit prevents API access without requiring Firebase account deletion, which is a destructive and less recoverable operation.

---

## Consequences

- No `DELETE /api/users/{id}` endpoint will be added.
- Tooling that needs to purge a user's PII must use the dedicated erasure workflow (future feature, tracked separately).
- The `IsActive` flag is checked at the Firebase claims middleware layer to enforce the suspension at login time.
