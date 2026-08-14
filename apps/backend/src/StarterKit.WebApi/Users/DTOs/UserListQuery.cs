using StarterKit.Core.Common;
using StarterKit.Core.Enums;
using StarterKit.Data.Clubs.Enums;

namespace StarterKit.WebApi.Users.DTOs;

public sealed class UserListQuery : PagedAndFilteredQuery
{
    /// <summary>Filter to users belonging to a specific club.</summary>
    public Guid? ClubId { get; init; }

    /// <summary>Filter to users belonging to a specific team.</summary>
    public Guid? TeamId { get; init; }

    /// <summary>Filter by active status. Null = all users.</summary>
    public bool? IsActive { get; init; }

    /// <summary>Filter by sign-in method. Null = all methods.</summary>
    public AuthenticationMethod? AuthMethod { get; init; }

    /// <summary>Filter to users assigned the named role. Null = all roles.</summary>
    public string? RoleName { get; init; }

    /// <summary>Filter by setup status. Null = all users regardless of setup status.</summary>
    public SetupStatus? SetupStatus { get; init; }
}
