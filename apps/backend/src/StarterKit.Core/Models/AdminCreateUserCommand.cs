using StarterKit.Data.Clubs.Enums;
using StarterKit.Data.Users.Enums;

namespace StarterKit.Core.Models;

/// <summary>Command model for admin-provisioned user creation.</summary>
/// <param name="Username">Required when AuthMethod is CustomAuthentication.</param>
/// <param name="Password">Password for CustomAuthentication users. Set by the admin and passed to Firebase.</param>
public sealed record AdminCreateUserCommand(
    Guid ClubId,
    string RoleName,
    string FirstName,
    string LastName,
    AuthenticationMethod AuthMethod,
    string? Email,
    string? PhoneNumber,
    string? Username = null,
    string? Password = null,
    DateOnly? DateOfBirth = null,
    PlayingPosition? Position = null,
    int? JerseyNumber = null,
    IReadOnlyList<Guid>? TeamIds = null,
    IReadOnlyList<Guid>? DependentUserIds = null,
    string? ParentGuardianEmail = null
);
