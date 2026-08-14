using StarterKit.Core.Auth.DTOs;
using StarterKit.Core.Common;
using StarterKit.Core.Models;
using StarterKit.Core.Resources;
using StarterKit.Data.AccountSetup.Enums;

namespace StarterKit.Core.Interfaces.Services;

public interface IUserService
{
    Task<IPagedResult<User>> ListAsync(
        UserQuery query,
        CancellationToken cancellationToken = default
    );
    Task<User> GetOrCreateAsync(
        string externalAuthId,
        string email,
        string displayName,
        Guid clubId,
        string? photoUrl = null,
        CancellationToken cancellationToken = default
    );
    Task<User> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<User?> GetByExternalAuthIdAsync(
        string externalAuthId,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Club-scoped lookup by external auth ID. Preferred over the cross-tenant overload
    /// whenever the <c>club_id</c> claim is available in the JWT.
    /// </summary>
    Task<User?> GetByExternalAuthIdAndClubAsync(
        string externalAuthId,
        Guid clubId,
        CancellationToken cancellationToken = default
    );
    Task<IEnumerable<Role>> GetUserRolesAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    );
    Task<User> AssignRoleAsync(
        Guid userId,
        string roleName,
        CancellationToken cancellationToken = default
    );
    Task<IReadOnlySet<string>> GetUserPermissionsAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    );
    Task UpdateLastLoginAsync(Guid userId, CancellationToken cancellationToken = default);

    Task UpdateDisplayNameAsync(
        Guid userId,
        string displayName,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Returns the full profile for the given user, with <c>AvatarUrl</c> resolved to a
    /// short-lived SAS URL if the user has an avatar stored in blob storage.
    /// </summary>
    Task<User> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates the authenticated user's self-service profile fields (display name, avatar,
    /// and — since the identity split — playing position, jersey number, onboarding photos, and onboarding
    /// completion). Any field left unset on the command leaves the corresponding value unchanged.
    /// </summary>
    Task UpdateProfileAsync(
        UpdateProfileCommand command,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Returns the athletes linked to the given parent via <c>UserGuardian</c>, each with the
    /// relationship the parent has declared so far. Photo URLs are
    /// resolved to short-lived SAS URLs. Empty when the parent has no linked athletes.
    /// </summary>
    Task<IReadOnlyList<LinkedAthlete>> ListLinkedAthletesAsync(
        Guid guardianUserId,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Records the parent's relationship to each of their linked athletes. Throws
    /// <see cref="ArgumentException"/> when the command is empty, contains duplicate athletes, or
    /// names an athlete who is not linked to this parent — a parent may only describe their own
    /// links.
    /// </summary>
    Task SetGuardianRelationshipsAsync(
        SetGuardianRelationshipsCommand command,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Returns the teams linked to the given coach via <c>UserTeam</c> (the identity split coach
    /// onboarding). Logo URLs are resolved to short-lived SAS URLs. Empty when the coach has no
    /// linked teams.
    /// </summary>
    Task<IReadOnlyList<LinkedTeam>> ListLinkedTeamsAsync(
        Guid coachUserId,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Throws <see cref="StarterKit.Data.Exceptions.EntityNotFoundException"/> when the given team is
    /// not linked to the given coach. Callers that need to perform work (e.g. a blob
    /// upload) before persisting should call this first, so an unauthorized/nonexistent team is
    /// rejected before that work happens rather than after.
    /// </summary>
    Task EnsureCoachLinkedToTeamAsync(
        Guid coachUserId,
        Guid teamId,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Sets the logo for a team linked to the given coach. Throws
    /// <see cref="StarterKit.Data.Exceptions.EntityNotFoundException"/> when the team is not linked to
    /// this coach — a coach may only set the logo for their own teams.
    /// </summary>
    Task SetLinkedTeamLogoAsync(
        Guid coachUserId,
        Guid teamId,
        string logoBlobPath,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Admin: removes a user's avatar — deletes the blob from storage and clears the DB field.
    /// Throws <see cref="StarterKit.Data.Exceptions.EntityNotFoundException"/> when the user does not exist.
    /// </summary>
    Task RemoveAvatarAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates (size, declared content type, and magic-byte signature) and uploads an avatar
    /// image, returning the stored blob path and a short-lived SAS URL. Throws
    /// <see cref="ArgumentException"/> on any validation failure.
    /// </summary>
    Task<(string StoredPath, string? Url)> UploadAvatarAsync(
        Guid userId,
        UploadedFile file,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Validates and uploads an onboarding face photo. See <see cref="UploadAvatarAsync"/> for
    /// the validation contract.
    /// </summary>
    Task<(string StoredPath, string? Url)> UploadFacePhotoAsync(
        Guid userId,
        UploadedFile file,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Validates and uploads an onboarding full-body photo. See <see cref="UploadAvatarAsync"/>
    /// for the validation contract.
    /// </summary>
    Task<(string StoredPath, string? Url)> UploadFullBodyPhotoAsync(
        Guid userId,
        UploadedFile file,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Validates and uploads a team logo image. Does not check coach/team linkage —
    /// callers that need that check should call <see cref="EnsureCoachLinkedToTeamAsync"/> first.
    /// See <see cref="UploadAvatarAsync"/> for the validation contract.
    /// </summary>
    Task<(string StoredPath, string? Url)> UploadTeamLogoImageAsync(
        Guid teamId,
        UploadedFile file,
        CancellationToken cancellationToken = default
    );

    /// <summary>Activates or suspends a user. Throws <see cref="StarterKit.Data.Exceptions.EntityNotFoundException"/> when the user does not exist.</summary>
    Task SetActiveAsync(Guid userId, bool isActive, CancellationToken cancellationToken = default);

    /// <summary>
    /// Links a user to a club, assigns them a role, and (for Firebase users) sets the
    /// club_id custom claim. Throws <see cref="StarterKit.Data.Exceptions.EntityNotFoundException"/>
    /// when either the user or the club does not exist.
    /// </summary>
    Task<User> LinkToClubAsync(
        Guid userId,
        Guid clubId,
        string role,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Replaces the placeholder ExternalAuthId on a seeded user row with the real Firebase UID,
    /// then sets the club_id custom claim so subsequent token refreshes include it.
    /// Used by the dev bootstrap flow to link the seeded Test Player to the live Firebase
    /// phone-auth account for +27123456789.
    /// </summary>
    Task<User> LinkExternalAuthIdAsync(
        Guid userId,
        string newExternalAuthId,
        CancellationToken cancellationToken = default
    );

    /// <summary>Looks up a pre-registered user by email address. Returns null when not found.</summary>
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);

    /// <summary>
    /// Links an OID-based externalAuthId (e.g. "ms:{oid}") to an existing user record.
    /// Used on first Microsoft 365 sign-in so subsequent logins find the user by OID directly.
    /// </summary>
    Task UpdateExternalAuthIdAsync(
        Guid userId,
        string externalAuthId,
        CancellationToken cancellationToken = default
    );

    /// <summary>Returns all available roles.</summary>
    Task<IReadOnlyList<Role>> ListRolesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Admin-provisions a new user for a club.
    /// For Credentials clubs, creates a Firebase user and a DB record.
    /// For SSO clubs (Microsoft365/Google), creates only a DB record (user self-provisions on first login).
    /// Throws <see cref="StarterKit.Data.Exceptions.EntityNotFoundException"/> when the club does not exist.
    /// Throws <see cref="StarterKit.Data.Exceptions.ConflictException"/> when a duplicate or limit is hit.
    /// </summary>
    Task<(User User, string? SetupLink)> AdminCreateUserAsync(
        AdminCreateUserCommand command,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Updates an existing user's profile (name, team, role, email, phone).
    /// Throws <see cref="StarterKit.Data.Exceptions.EntityNotFoundException"/> when the user does not exist.
    /// Throws <see cref="StarterKit.Data.Exceptions.ConflictException"/> when email or phone conflict is detected.
    /// </summary>
    Task<User> AdminUpdateUserAsync(
        UpdateUserCommand command,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Soft-deletes a user. Also deletes the corresponding Firebase user if one exists.
    /// Throws <see cref="StarterKit.Data.Exceptions.EntityNotFoundException"/> when the user does not exist.
    /// </summary>
    Task DeleteUserAsync(Guid userId, CancellationToken cancellationToken = default);

    // ── Account-setup flow (ABC-123) ─────────────────────────────────────────

    /// <summary>
    /// Validates a setup token received from the email link.
    /// Returns the associated email and token purpose for pre-filling the setup form with context-appropriate copy.
    /// Throws <see cref="StarterKit.Data.Exceptions.EntityNotFoundException"/> when token is not found, expired, or already used.
    /// </summary>
    Task<(string Email, SetupTokenPurpose Purpose)> ValidateSetupTokenAsync(
        string token,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Completes the account setup: validates the token, sets the user's chosen password in Firebase,
    /// marks the token as used, and records a security audit event.
    /// Throws <see cref="StarterKit.Data.Exceptions.EntityNotFoundException"/> when the token is invalid.
    /// Throws <see cref="System.ArgumentException"/> when the new password fails complexity or matches the temp password.
    /// </summary>
    Task CompleteSetupAsync(
        string token,
        string newPassword,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Invalidates any outstanding setup tokens for the given user, generates a fresh token,
    /// and resends the setup email. Only valid for Credentials users that have not yet completed setup.
    /// Throws <see cref="StarterKit.Data.Exceptions.EntityNotFoundException"/> when the user does not exist.
    /// </summary>
    Task<string> ResendSetupLinkAsync(
        Guid userId,
        bool sendEmail = true,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Issues a self-service password reset token for the Credentials user identified by
    /// <paramref name="email"/> and sends the reset link email.
    /// Always completes successfully (204) regardless of whether the email exists,
    /// to prevent user enumeration (OWASP).
    /// In development environments, returns the reset link so it can be surfaced in the UI
    /// for testing without a real email provider. Returns <c>null</c> in production.
    /// </summary>
    Task<string?> RequestPasswordResetAsync(
        string email,
        bool returnLinkForDev = false,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Scans for expired, unused setup tokens, emits audit log entries for each,
    /// and marks them as invalidated so subsequent scans skip them (AC 7d).
    /// Called by the background <c>SetupTokenExpiryService</c>.
    /// </summary>
    Task ProcessExpiredSetupTokensAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Hard-deletes setup and password-reset tokens older than the configured retention period.
    /// Called by the daily Hangfire cleanup job. Active tokens are never deleted.
    /// </summary>
    Task CleanupSetupTokensAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Admin-only: sets a new password for a CustomAuthentication user directly in Firebase.
    /// No complexity validation — the caller decides what password to set.
    /// Throws <see cref="StarterKit.Data.Exceptions.EntityNotFoundException"/> when the user does not exist.
    /// Throws <see cref="StarterKit.Data.Exceptions.ConflictException"/> when the user is not a
    /// CustomAuthentication user or does not have a valid Firebase UID.
    /// </summary>
    Task AdminChangePasswordAsync(
        Guid userId,
        string newPassword,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Self-service: allows an authenticated CustomAuthentication user to change their own
    /// password. Validates complexity requirements.
    /// Throws <see cref="StarterKit.Data.Exceptions.EntityNotFoundException"/> when the user does not exist.
    /// Throws <see cref="System.ArgumentException"/> when the new password fails complexity checks.
    /// Throws <see cref="StarterKit.Data.Exceptions.ConflictException"/> when the user is not a
    /// CustomAuthentication user or does not have a valid Firebase UID.
    /// </summary>
    Task ChangePasswordAsync(
        Guid userId,
        string newPassword,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Returns all organisations (clubs) linked to the given Firebase UID.
    /// Used by the multi-org selection screen in the mobile app.
    /// </summary>
    Task<IReadOnlyList<LinkedOrganisation>> GetLinkedOrganisationsAsync(
        string firebaseUid,
        CancellationToken cancellationToken = default
    );

    // ── Bulk upload ──────────────────────────────────────────────────────────

    /// <summary>
    /// Returns the XLSX template bytes with data-validation dropdowns pre-populated for the
    /// given club (roles and teams scoped to <paramref name="clubId"/>).
    /// </summary>
    Task<byte[]> GetBulkUploadTemplateAsync(
        Guid clubId,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Parses an uploaded XLSX file against the club context, validates each row, checks for
    /// duplicates, and returns a categorised preview without persisting anything.
    /// Throws <see cref="StarterKit.Core.Users.Exceptions.BulkUploadValidationException"/> when
    /// the file is missing required template columns.
    /// </summary>
    Task<StarterKit.Core.Users.DTOs.BulkUploadPreviewDto> PreviewBulkUploadAsync(
        Guid clubId,
        Guid? teamId,
        Stream fileStream,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Exports all users for <paramref name="clubId"/> (optionally scoped to a team)
    /// as an XLSX byte array. Intended for admin download only — bypasses the normal page-size cap.
    /// </summary>
    Task<byte[]> ExportUsersAsync(
        Guid clubId,
        Guid? teamId,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Creates the users in <paramref name="validRows"/> one by one. Rows that fail (e.g. race
    /// condition on uniqueness) are collected and returned rather than aborting the batch.
    /// </summary>
    Task<StarterKit.Core.Users.DTOs.BulkUploadConfirmDto> ConfirmBulkUploadAsync(
        Guid clubId,
        Guid? teamId,
        IReadOnlyList<StarterKit.Core.Users.DTOs.BulkUploadValidUserDto> validRows,
        string? defaultPassword,
        CancellationToken cancellationToken = default
    );
}
