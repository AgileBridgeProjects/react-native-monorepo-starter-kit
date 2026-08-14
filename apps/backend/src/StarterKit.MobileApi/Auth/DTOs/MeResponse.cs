namespace StarterKit.MobileApi.Auth.DTOs;

public sealed record MeResponse(
    Guid ClubId,
    string? ClubName = null,
    string? ClubLogoUrl = null,
    IReadOnlyList<string>? Permissions = null
)
{
    public IReadOnlyList<string> Permissions { get; init; } = Permissions ?? [];
}
