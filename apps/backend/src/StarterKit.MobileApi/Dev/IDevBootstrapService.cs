namespace StarterKit.MobileApi.Dev;

/// <summary>
/// Development-only service for linking a Firebase phone-auth identity to the seeded
/// StarterKit dev club and test player account.
/// </summary>
public interface IDevBootstrapService
{
    Task<DevBootstrapResult> BootstrapPhoneUserAsync(
        string firebaseIdToken,
        CancellationToken cancellationToken = default
    );
}

public sealed record DevBootstrapResult(Guid UserId, Guid ClubId);
