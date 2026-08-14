namespace StarterKit.WebApi.Clubs.DTOs;

public sealed class ClubResponse
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }

    /// <summary>Street address of the club (e.g. "123 Main St").</summary>
    public required string StreetAddress { get; init; }

    /// <summary>City the club is located in (e.g. "Denver").</summary>
    public required string City { get; init; }

    /// <summary>Two-letter USPS state code (e.g. "CO").</summary>
    public required string State { get; init; }

    /// <summary>ZIP code ("80202" or "80202-1234"). Null when not captured.</summary>
    public string? ZipCode { get; init; }

    /// <summary>IANA time-zone identifier (e.g. "America/Denver"). Null when not set.</summary>
    public string? Timezone { get; init; }

    /// <summary>Maximum number of athletes allowed. Null means no limit.</summary>
    public int? MaxAthletes { get; init; }

    public string? LogoUrl { get; init; }

    public required DateTime CreatedAt { get; init; }
    public string? CreatedBy { get; init; }
    public DateTime? UpdatedAt { get; init; }
    public string? UpdatedBy { get; init; }
    public required bool IsDeleted { get; init; }
    public DateTime? DeletedAt { get; init; }

    /// <summary>Number of active users in this club. Only on list responses; null on single-item.</summary>
    public int? ActiveUserCount { get; init; }

    /// <summary>Number of teams in this club. Only on list responses; null on single-item.</summary>
    public int? TeamCount { get; init; }
}
