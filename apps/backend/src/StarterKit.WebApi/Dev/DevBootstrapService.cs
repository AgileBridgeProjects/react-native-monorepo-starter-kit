using StarterKit.Auth.Interfaces;
using StarterKit.Core.Interfaces.Services;

namespace StarterKit.WebApi.Dev;

public sealed class DevBootstrapService(
    ISupabaseAuthService supabaseAuthService,
    IUserService userService
) : IDevBootstrapService
{
    private static readonly Guid StarterKitClubId = new("00000000-0000-0000-0000-000000000010");

    /// <summary>
    /// The seeded dev test phone user's fixed DB GUID — matches DevAdminSeeder.DevPhoneTestUserId.
    /// </summary>
    private static readonly Guid DevPhoneTestUserId = new("00000000-0000-0000-0000-000000000020");

    /// <summary>
    /// The dev test phone number that maps to the seeded Test Player row. After the first
    /// bootstrap call the ExternalAuthId is permanently linked to the Test Player profile.
    /// </summary>
    private const string DevTestPhoneNumber = "+27123456789";

    private const string DevAdminEmail = "admin@starterkit.local";

    public Task<DevBootstrapResult> BootstrapPhoneUserAsync(
        string accessToken,
        CancellationToken cancellationToken = default
    )
    {
        var token =
            supabaseAuthService.ValidateToken(accessToken)
            ?? throw new UnauthorizedAccessException("Invalid Supabase access token.");

        return BootstrapPhoneUserCoreAsync(token.Subject, token.Phone, cancellationToken);
    }

    private async Task<DevBootstrapResult> BootstrapPhoneUserCoreAsync(
        string authUserId,
        string? phone,
        CancellationToken cancellationToken
    )
    {
        // The test number maps to the seeded "Test Player" profile.
        // LinkExternalAuthIdAsync replaces the placeholder ExternalAuthId with the real
        // auth user id and sets the club_id claim — fully idempotent.
        if (string.Equals(phone, DevTestPhoneNumber, StringComparison.Ordinal))
        {
            var testUser = await userService.LinkExternalAuthIdAsync(
                DevPhoneTestUserId,
                authUserId,
                cancellationToken
            );
            return new DevBootstrapResult(testUser.Id, StarterKitClubId);
        }

        // Any other phone number: create (or return the existing) user on the fly.
        var displayName = string.IsNullOrEmpty(phone) ? "Phone User" : phone;
        var user = await userService.GetOrCreateAsync(
            authUserId,
            email: string.Empty,
            displayName,
            StarterKitClubId,
            cancellationToken: cancellationToken
        );

        await userService.AssignRoleAsync(user.Id, "Athlete", cancellationToken);

        return new DevBootstrapResult(user.Id, StarterKitClubId);
    }

    public async Task<DevBootstrapResult> BootstrapAdminAsync(
        string accessToken,
        CancellationToken cancellationToken = default
    )
    {
        var token =
            supabaseAuthService.ValidateToken(accessToken)
            ?? throw new UnauthorizedAccessException("Invalid Supabase access token.");

        var email = token.Email ?? string.Empty;

        if (!string.Equals(email, DevAdminEmail, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException(
                "Only admin@starterkit.local may use the dev bootstrap endpoint."
            );

        var displayName = token.Name ?? DevAdminEmail;

        // Check if the admin user was already seeded (DevAdminSeeder) with a placeholder
        // ExternalAuthId. If so, link the real auth user id instead of creating a duplicate.
        var existing = await userService.GetByEmailAsync(email, cancellationToken);
        if (existing is not null && existing.ExternalAuthId != token.Subject)
        {
            await userService.UpdateExternalAuthIdAsync(
                existing.Id,
                token.Subject,
                cancellationToken
            );
        }

        // GetOrCreateAsync creates the DB row (or finds the now-linked one) and sets the
        // club_id claim in app_metadata on first call.
        var user = await userService.GetOrCreateAsync(
            token.Subject,
            email,
            displayName,
            StarterKitClubId,
            cancellationToken: cancellationToken
        );

        // AssignRoleAsync is idempotent — no-ops if SuperAdmin is already assigned
        await userService.AssignRoleAsync(user.Id, "SuperAdmin", cancellationToken);

        return new DevBootstrapResult(user.Id, StarterKitClubId);
    }
}
