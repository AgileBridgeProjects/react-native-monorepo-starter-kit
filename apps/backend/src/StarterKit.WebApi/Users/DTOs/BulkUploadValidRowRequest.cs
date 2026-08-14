using System.ComponentModel.DataAnnotations;
using StarterKit.Core.Users;
using StarterKit.Data.Clubs.Enums;
using StarterKit.Data.Users.Enums;

namespace StarterKit.WebApi.Users.DTOs;

/// <summary>
/// A single valid user row returned by the preview step and sent back on confirm.
/// The client echoes this data from the preview response so the server can create the users
/// without re-parsing the original file (stateless flow).
/// </summary>
public sealed class BulkUploadValidRowRequest
{
    public int RowNumber { get; init; }
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public string? Email { get; init; }
    public string? PhoneNumber { get; init; }
    public string? CountryCode { get; init; }
    public AuthenticationMethod AuthMethod { get; init; }
    public string RoleName { get; init; } = string.Empty;
    public string? TeamName { get; init; }
    public Guid? TeamId { get; init; }
    public string? Username { get; init; }

    /// <summary>Date of birth. Required when RoleName is "Athlete".</summary>
    public DateOnly? DateOfBirth { get; init; }

    /// <summary>Optional volleyball playing position. Athlete users.</summary>
    public PlayingPosition? Position { get; init; }

    /// <summary>Optional jersey number. Athlete users.</summary>
    [Range(JerseyNumberConstraints.Min, JerseyNumberConstraints.Max)]
    public int? JerseyNumber { get; init; }

    /// <summary>
    /// Email of this Athlete's Parent/Guardian, resolved to a <c>UserGuardian</c> link on confirm.
    /// Matches either an existing user in the club or another "Parent" row in the same upload.
    /// </summary>
    [MaxLength(254)]
    public string? ParentGuardianEmail { get; init; }
}
