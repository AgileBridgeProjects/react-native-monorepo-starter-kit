using StarterKit.Data.Auditing;

namespace StarterKit.Data.Clubs.Models;

public class Club : IAuditable, ISoftDeletable, IConcurrent
{
    public Guid Id { get; set; }

    /// <summary>Display name of the club.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Street address of the club (e.g. "123 Main St"). Max 200 chars.</summary>
    public string StreetAddress { get; set; } = string.Empty;

    /// <summary>City the club is located in (e.g. "Denver"). Max 100 chars.</summary>
    public string City { get; set; } = string.Empty;

    /// <summary>
    /// Two-letter USPS state code (e.g. "CO"). Also narrows the timezone picker client-side,
    /// but the timezone itself is stored independently (see <see cref="Timezone"/> / the identity split).
    /// </summary>
    public string State { get; set; } = string.Empty;

    /// <summary>Optional ZIP code ("80202" or "80202-1234"). Max 10 chars.</summary>
    public string? ZipCode { get; set; }

    /// <summary>
    /// IANA time-zone identifier for the club (e.g. "America/Denver"). Max 100 chars.
    /// Per the identity split: store the IANA zone id (never a UTC offset, never derived from state — states
    /// straddle zones and Arizona skips DST). Null means no zone selected. Recurring-local scheduling
    /// (NodaTime) is the identity split's scope, not this field.
    /// </summary>
    public string? Timezone { get; set; }

    /// <summary>
    /// Maximum number of athletes allowed for this club. Null means no limit is enforced.
    /// Drives the parent-account allowance (up to 2 parents per athlete).
    /// </summary>
    public int? MaxAthletes { get; set; }

    /// <summary>
    /// URL to the club logo stored in blob storage.
    /// Upload via POST /api/clubs/images to obtain this URL before creating or updating.
    /// </summary>
    public string? LogoUrl { get; set; }

    // IAuditable
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    // ISoftDeletable
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }
}
