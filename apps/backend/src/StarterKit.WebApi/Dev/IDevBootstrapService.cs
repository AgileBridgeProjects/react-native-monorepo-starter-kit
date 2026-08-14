namespace StarterKit.WebApi.Dev;

public interface IDevBootstrapService
{
    /// <summary>
    /// Links the Firebase account identified by <paramref name="firebaseIdToken"/> to the
    /// seeded StarterKit club, assigns the SuperAdmin role, and sets the club_id custom
    /// claim so the next token refresh includes it.
    ///
    /// Only works for admin@starterkit.local. Fully idempotent.
    /// </summary>
    Task<DevBootstrapResult> BootstrapAdminAsync(
        string firebaseIdToken,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Dev-only: links any Firebase phone-auth user to the seeded StarterKit club and sets
    /// the club_id custom claim. Fully idempotent. The client must force-refresh the
    /// Firebase token after calling this so the claim is visible in subsequent requests.
    /// </summary>
    Task<DevBootstrapResult> BootstrapPhoneUserAsync(
        string firebaseIdToken,
        CancellationToken cancellationToken = default
    );
}

public sealed record DevBootstrapResult(Guid UserId, Guid ClubId);
