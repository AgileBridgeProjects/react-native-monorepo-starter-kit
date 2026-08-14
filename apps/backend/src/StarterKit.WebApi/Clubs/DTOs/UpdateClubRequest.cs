using System.ComponentModel.DataAnnotations;

namespace StarterKit.WebApi.Clubs.DTOs;

public sealed class UpdateClubRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; init; } = string.Empty;

    /// <summary>Street address of the club (e.g. "123 Main St").</summary>
    [Required]
    [MaxLength(200)]
    public string StreetAddress { get; init; } = string.Empty;

    /// <summary>City the club is located in (e.g. "Denver").</summary>
    [Required]
    [MaxLength(100)]
    public string City { get; init; } = string.Empty;

    /// <summary>Two-letter USPS state code (e.g. "CO").</summary>
    [Required]
    [RegularExpression("^[A-Z]{2}$", ErrorMessage = "State must be a two-letter USPS code.")]
    public string State { get; init; } = string.Empty;

    /// <summary>Optional ZIP code ("80202" or "80202-1234").</summary>
    [RegularExpression(@"^\d{5}(-\d{4})?$", ErrorMessage = "ZipCode must be 12345 or 12345-6789.")]
    public string? ZipCode { get; init; }

    /// <summary>Optional IANA time-zone identifier (e.g. "America/Denver").</summary>
    [MaxLength(100)]
    public string? Timezone { get; init; }

    /// <summary>Maximum number of athletes allowed. Null means no limit.</summary>
    [Range(1, int.MaxValue, ErrorMessage = "MaxAthletes must be a positive number.")]
    public int? MaxAthletes { get; init; }

    /// <summary>
    /// URL to the club logo. Obtain by calling POST /api/clubs/images first.
    /// </summary>
    [MaxLength(2048)]
    public string? LogoUrl { get; init; }
}
