namespace StarterKit.Data.Users.Models;

/// <summary>
/// Minimal user projection for pickers (e.g. DM-recipient candidates) — just enough to render a
/// name and avatar, without pulling the full <see cref="Persistence.Entities.UserEntity"/>.
/// </summary>
public sealed record UserSummary(Guid Id, string DisplayName, string? AvatarUrl);
