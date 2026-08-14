using System.Security.Claims;
using StarterKit.Auth.Constants;

namespace StarterKit.Auth.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetInternalUserId(this ClaimsPrincipal principal) =>
        Guid.Parse(
            principal.FindFirstValue(StarterKitClaims.InternalUserId)
                ?? throw new UnauthorizedAccessException(
                    $"{StarterKitClaims.InternalUserId} claim is missing."
                )
        );

    public static Guid GetClubId(this ClaimsPrincipal principal) =>
        Guid.Parse(
            principal.FindFirstValue(StarterKitClaims.InternalClubId)
                ?? principal.FindFirstValue(SupabaseClaims.ClubId)
                ?? throw new UnauthorizedAccessException("club_id claim is missing.")
        );
}
