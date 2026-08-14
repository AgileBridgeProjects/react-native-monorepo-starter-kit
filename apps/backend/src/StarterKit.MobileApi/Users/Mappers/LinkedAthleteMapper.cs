using Riok.Mapperly.Abstractions;
using StarterKit.Core.Models;
using StarterKit.MobileApi.Users.DTOs;

namespace StarterKit.MobileApi.Users.Mappers;

/// <summary>
/// Maps the parent onboarding linked-athlete shapes across the HTTP boundary. Shared by
/// <see cref="UsersController"/> and its MCP tool class so both expose an identical wire shape.
/// </summary>
[Mapper]
public static partial class LinkedAthleteMapper
{
    public static partial LinkedAthleteResponse ToResponse(this LinkedAthlete model);

    public static partial IReadOnlyList<LinkedAthleteResponse> ToResponseList(
        this IReadOnlyList<LinkedAthlete> models
    );

    public static SetGuardianRelationshipsCommand ToCommand(
        this SetLinkedAthleteRelationshipsRequest request,
        Guid guardianUserId
    ) =>
        new()
        {
            GuardianUserId = guardianUserId,
            Relationships =
            [
                .. request.Relationships.Select(r => new GuardianRelationshipAssignment(
                    r.AthleteUserId,
                    r.Relationship
                )),
            ],
        };
}
