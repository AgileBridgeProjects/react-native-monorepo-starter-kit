using StarterKit.Auth.Interfaces;
using StarterKit.Core.Interfaces.Services;

namespace StarterKit.MobileApi.Dev;

/// <summary>
/// Development-only implementation that links the test phone number <c>+27123456789</c> to the
/// seeded Test Player row, or creates a standard user in the StarterKit dev club for any other
/// phone-auth account.
/// </summary>
public sealed class DevBootstrapService(
    ISupabaseAuthService supabaseAuthService,
    IUserService userService
) : IDevBootstrapService
{
    private static readonly Guid StarterKitClubId = new("00000000-0000-0000-0000-000000000010");
    private static readonly Guid DevPhoneTestUserId = new("00000000-0000-0000-0000-000000000020");
    private const string DevTestPhoneNumber = "+27123456789";

    public async Task<DevBootstrapResult> BootstrapPhoneUserAsync(
        string accessToken,
        CancellationToken cancellationToken = default
    )
    {
        var token =
            supabaseAuthService.ValidateToken(accessToken)
            ?? throw new UnauthorizedAccessException("Invalid Supabase access token.");

        var phone = token.Phone ?? string.Empty;

        if (string.Equals(phone, DevTestPhoneNumber, StringComparison.Ordinal))
        {
            var testUser = await userService.LinkExternalAuthIdAsync(
                DevPhoneTestUserId,
                token.Subject,
                cancellationToken
            );

            return new DevBootstrapResult(testUser.Id, StarterKitClubId);
        }

        var displayName = string.IsNullOrEmpty(phone) ? "Phone User" : phone;
        var user = await userService.GetOrCreateAsync(
            token.Subject,
            email: string.Empty,
            displayName,
            StarterKitClubId,
            cancellationToken: cancellationToken
        );

        await userService.AssignRoleAsync(user.Id, "Athlete", cancellationToken);

        return new DevBootstrapResult(user.Id, StarterKitClubId);
    }
}
